import { ensureSqlSchema, sql } from '@/features/persistence/sql-client';
import { getDemoModeConfig } from '@/features/demo-mode/config';

export type DemoUsageType = 'ai' | 'submit' | 'survey-create';

export type DemoUsageEvent = {
  type: DemoUsageType;
  visitorId: string | null;
  ipHash: string | null;
  surveyId: string | null;
  createdAt: string;
};

export type DemoUsageFilter = {
  type: DemoUsageType;
  visitorId?: string;
  ipHash?: string;
  surveyId?: string;
  since?: Date;
};

export interface DemoUsageStore {
  countEvents(filter: DemoUsageFilter): Promise<number>;
  recordEvent(event: DemoUsageEvent): Promise<void>;
}

export class DemoQuotaExceededError extends Error {
  status = 429;

  constructor(public code: string, public userMessage: string) {
    super(userMessage);
    this.name = 'DemoQuotaExceededError';
  }
}

function matchesFilter(event: DemoUsageEvent, filter: DemoUsageFilter) {
  if (event.type !== filter.type) return false;
  if (filter.visitorId && event.visitorId !== filter.visitorId) return false;
  if (filter.ipHash && event.ipHash !== filter.ipHash) return false;
  if (filter.surveyId && event.surveyId !== filter.surveyId) return false;
  if (filter.since && event.createdAt < filter.since.toISOString()) return false;
  return true;
}

export function createMemoryDemoUsageStore(initialEvents: DemoUsageEvent[] = []): DemoUsageStore {
  const events = [...initialEvents];

  return {
    async countEvents(filter) {
      return events.filter((event) => matchesFilter(event, filter)).length;
    },
    async recordEvent(event) {
      events.push(event);
    }
  };
}

function createSqlDemoUsageStore(): DemoUsageStore {
  return {
    async countEvents(filter) {
      await ensureSqlSchema();
      const result = await sql<{ count: string | number }>(
        `
          select count(*) as count
          from wenjuan_demo_usage_events
          where event_type = $1
            and ($2::text is null or visitor_id = $2)
            and ($3::text is null or ip_hash = $3)
            and ($4::text is null or survey_id = $4)
            and ($5::timestamptz is null or created_at >= $5::timestamptz)
        `,
        [
          filter.type,
          filter.visitorId ?? null,
          filter.ipHash ?? null,
          filter.surveyId ?? null,
          filter.since?.toISOString() ?? null
        ]
      );
      return Number(result.rows[0]?.count ?? 0);
    },
    async recordEvent(event) {
      await ensureSqlSchema();
      await sql(
        `
          insert into wenjuan_demo_usage_events (event_type, visitor_id, ip_hash, survey_id, created_at)
          values ($1, $2, $3, $4, $5::timestamptz)
        `,
        [event.type, event.visitorId, event.ipHash, event.surveyId, event.createdAt]
      );
    }
  };
}

let defaultStore: DemoUsageStore | null = null;

export function getDemoUsageStore() {
  defaultStore ??= createSqlDemoUsageStore();
  return defaultStore;
}

export function resetDemoUsageStoreForTests() {
  defaultStore = null;
}

function startOfUtcDay(now: Date) {
  const day = new Date(now);
  day.setUTCHours(0, 0, 0, 0);
  return day;
}

function oneHourAgo(now: Date) {
  return new Date(now.getTime() - 60 * 60 * 1000);
}

function demoEventNow(now?: Date) {
  return now ?? new Date();
}

export async function assertAiQuota({ store, ipHash, now = new Date() }: { store: DemoUsageStore; ipHash: string; now?: Date }) {
  const config = getDemoModeConfig();
  if (!config.enabled) return;

  const used = await store.countEvents({ type: 'ai', ipHash, since: startOfUtcDay(now) });
  if (used >= config.aiDailyLimitPerIp) {
    throw new DemoQuotaExceededError('AI_DAILY_LIMIT', '演示站今日 AI 额度已用完，请明天再试，或克隆项目本地配置自己的模型。');
  }
}

export async function recordAiUsage({ store, visitorId, ipHash, now }: { store: DemoUsageStore; visitorId: string; ipHash: string; now?: Date }) {
  const config = getDemoModeConfig();
  if (!config.enabled) return;

  await store.recordEvent({ type: 'ai', visitorId, ipHash, surveyId: null, createdAt: demoEventNow(now).toISOString() });
}

export async function assertSubmitQuota({ store, ipHash, surveyId, now = new Date() }: { store: DemoUsageStore; visitorId: string; ipHash: string; surveyId: string; now?: Date }) {
  const config = getDemoModeConfig();
  if (!config.enabled) return;

  const used = await store.countEvents({ type: 'submit', ipHash, since: oneHourAgo(now) });
  if (used >= config.submitHourlyLimitPerIp) {
    throw new DemoQuotaExceededError('SUBMIT_HOURLY_LIMIT', '演示站提交过于频繁，请稍后再试。');
  }
}

export async function recordSubmitUsage({ store, visitorId, ipHash, surveyId, now }: { store: DemoUsageStore; visitorId: string; ipHash: string; surveyId: string; now?: Date }) {
  const config = getDemoModeConfig();
  if (!config.enabled) return;

  await store.recordEvent({ type: 'submit', visitorId, ipHash, surveyId, createdAt: demoEventNow(now).toISOString() });
}

export async function assertSurveyCreateQuota({ store, visitorId, now = new Date() }: { store: DemoUsageStore; visitorId: string; now?: Date }) {
  const config = getDemoModeConfig();
  if (!config.enabled) return;

  const since = new Date(now.getTime() - config.dataTtlDays * 24 * 60 * 60 * 1000);
  const used = await store.countEvents({ type: 'survey-create', visitorId, since });
  if (used >= config.maxSurveysPerVisitor) {
    throw new DemoQuotaExceededError('SURVEY_CREATE_LIMIT', '演示站创建问卷数量已达上限，可以复制项目到本地继续使用。');
  }
}

export async function recordSurveyCreateUsage({ store, visitorId, ipHash, surveyId, now }: { store: DemoUsageStore; visitorId: string; ipHash: string; surveyId: string; now?: Date }) {
  const config = getDemoModeConfig();
  if (!config.enabled) return;

  await store.recordEvent({ type: 'survey-create', visitorId, ipHash, surveyId, createdAt: demoEventNow(now).toISOString() });
}
