import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSqlTestDatabase } from '../helpers/sql-test-db';
import { runDemoDataCleanupIfNeeded } from '@/features/demo-mode/cleanup';
import { sql } from '@/features/persistence/sql-client';
import { getLatestSurveyDraft, saveSurveyDraft } from '@/features/persistence/repository';
import { createEmptySurvey } from '@/features/survey-schema/factories';

const DEMO_ENV_KEYS = ['WENJUAN_DEMO_MODE', 'WENJUAN_DEMO_DATA_TTL_DAYS'] as const;

describe('demo data cleanup', () => {
  useSqlTestDatabase();

  beforeEach(() => {
    process.env.WENJUAN_DEMO_MODE = 'true';
    process.env.WENJUAN_DEMO_DATA_TTL_DAYS = '1';
  });

  afterEach(() => {
    for (const key of DEMO_ENV_KEYS) {
      delete process.env[key];
    }
  });

  it('removes expired demo surveys and usage events once per UTC day', async () => {
    await saveSurveyDraft({ surveyId: 'old-survey', version: 1, document: createEmptySurvey({ id: 'old-survey' }) });
    await saveSurveyDraft({ surveyId: 'fresh-survey', version: 1, document: createEmptySurvey({ id: 'fresh-survey' }) });
    await sql(
      `update wenjuan_surveys set created_at = $2::timestamptz, updated_at = $2::timestamptz where survey_id = $1`,
      ['old-survey', '2026-05-20T00:00:00.000Z']
    );
    await sql(
      `insert into wenjuan_demo_usage_events (event_type, visitor_id, ip_hash, survey_id, created_at)
       values ($1, $2, $3, $4, $5::timestamptz), ($6, $7, $8, $9, $10::timestamptz)`,
      [
        'ai',
        'vis_old',
        'ip_old',
        'old-survey',
        '2026-05-20T00:00:00.000Z',
        'ai',
        'vis_fresh',
        'ip_fresh',
        'fresh-survey',
        '2026-05-22T00:00:00.000Z'
      ]
    );

    const firstRun = await runDemoDataCleanupIfNeeded(new Date('2026-05-22T12:00:00.000Z'));

    expect(firstRun).toMatchObject({ cleaned: true, deletedSurveys: 1, deletedUsageEvents: 1 });
    expect(await getLatestSurveyDraft('old-survey')).toBeNull();
    expect(await getLatestSurveyDraft('fresh-survey')).not.toBeNull();
    await sql(
      `update wenjuan_surveys set created_at = $2::timestamptz, updated_at = $2::timestamptz where survey_id = $1`,
      ['fresh-survey', '2026-05-20T00:00:00.000Z']
    );

    const secondRunSameDay = await runDemoDataCleanupIfNeeded(new Date('2026-05-22T13:00:00.000Z'));

    expect(secondRunSameDay).toMatchObject({ cleaned: false, reason: 'already-cleaned-today' });
    expect(await getLatestSurveyDraft('fresh-survey')).not.toBeNull();

    const nextDayRun = await runDemoDataCleanupIfNeeded(new Date('2026-05-23T00:00:00.000Z'));

    expect(nextDayRun).toMatchObject({ cleaned: true, deletedSurveys: 1 });
    expect(await getLatestSurveyDraft('fresh-survey')).toBeNull();
  });
});
