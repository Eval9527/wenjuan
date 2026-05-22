import { getDemoModeConfig } from '@/features/demo-mode/config';
import { ensureSqlSchema, sql } from '@/features/persistence/sql-client';

export type DemoCleanupResult =
  | { cleaned: false; reason: 'demo-disabled' | 'already-cleaned-today' }
  | { cleaned: true; reason: 'daily' | 'database-usage'; deletedSurveys: number; deletedUsageEvents: number; cutoff: string };

const LAST_CLEANUP_KEY = 'last_cleanup_utc_day';
const DAY_MS = 24 * 60 * 60 * 1000;

function toUtcDay(now: Date) {
  return now.toISOString().slice(0, 10);
}

function toCutoff(now: Date, ttlDays: number) {
  return new Date(now.getTime() - ttlDays * DAY_MS).toISOString();
}

async function isDatabaseNearUsageLimit(config: ReturnType<typeof getDemoModeConfig>) {
  if (!config.dbMaxBytes) {
    return false;
  }

  const result = await sql<{ bytes: string | number }>('select pg_database_size(current_database()) as bytes');
  const bytes = Number(result.rows[0]?.bytes ?? 0);
  return Number.isFinite(bytes) && bytes / config.dbMaxBytes >= config.dbUsageCleanupThreshold;
}

export async function runDemoDataCleanupIfNeeded(now = new Date()): Promise<DemoCleanupResult> {
  const config = getDemoModeConfig();
  if (!config.enabled) {
    return { cleaned: false, reason: 'demo-disabled' };
  }

  await ensureSqlSchema();

  const today = toUtcDay(now);
  const previous = await sql<{ value: string }>(
    'select value from wenjuan_demo_maintenance where key = $1 limit 1',
    [LAST_CLEANUP_KEY]
  );

  const alreadyCleanedToday = previous.rows[0]?.value === today;
  const nearDatabaseLimit = await isDatabaseNearUsageLimit(config);

  if (alreadyCleanedToday && !nearDatabaseLimit) {
    return { cleaned: false, reason: 'already-cleaned-today' };
  }

  const cutoff = toCutoff(now, config.dataTtlDays);
  const deletedSurveys = await sql<{ survey_id: string }>(
    'delete from wenjuan_surveys where created_at < $1::timestamptz returning survey_id',
    [cutoff]
  );
  const deletedUsageEvents = await sql(
    'delete from wenjuan_demo_usage_events where created_at < $1::timestamptz',
    [cutoff]
  );

  await sql(
    `
      insert into wenjuan_demo_maintenance (key, value, updated_at)
      values ($1, $2, $3::timestamptz)
      on conflict (key) do update set
        value = excluded.value,
        updated_at = excluded.updated_at
    `,
    [LAST_CLEANUP_KEY, today, now.toISOString()]
  );

  return {
    cleaned: true,
    reason: nearDatabaseLimit ? 'database-usage' : 'daily',
    deletedSurveys: deletedSurveys.rowCount ?? deletedSurveys.rows.length,
    deletedUsageEvents: deletedUsageEvents.rowCount ?? 0,
    cutoff
  };
}
