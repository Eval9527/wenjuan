import { afterEach, describe, expect, it } from 'vitest';
import { getDatabaseConfig, getDemoModeConfig } from '@/features/demo-mode/config';

const DEMO_ENV_KEYS = [
  'WENJUAN_DEMO_MODE',
  'DATABASE_URL',
  'WENJUAN_DEMO_MAX_SURVEYS_PER_VISITOR',
  'WENJUAN_DEMO_MAX_RESPONSES_PER_SURVEY',
  'WENJUAN_DEMO_AI_DAILY_LIMIT_PER_IP',
  'WENJUAN_DEMO_SUBMIT_HOURLY_LIMIT_PER_IP',
  'WENJUAN_DEMO_DATA_TTL_DAYS',
  'WENJUAN_DEMO_DB_USAGE_CLEANUP_THRESHOLD',
  'WENJUAN_DEMO_DB_MAX_BYTES'
] as const;

describe('demo mode config', () => {
  afterEach(() => {
    for (const key of DEMO_ENV_KEYS) {
      delete process.env[key];
    }
  });

  it('keeps demo mode disabled by default while requiring SQL database config for persistence', () => {
    expect(getDemoModeConfig()).toMatchObject({
      enabled: false,
      maxSurveysPerVisitor: 5,
      maxResponsesPerSurvey: 50,
      aiDailyLimitPerIp: 10,
      submitHourlyLimitPerIp: 20,
      dataTtlDays: 7,
      dbUsageCleanupThreshold: 0.9,
      dbMaxBytes: null
    });
    expect(() => getDatabaseConfig()).toThrow('DATABASE_URL is required for Wenjuan SQL storage');
  });

  it('parses demo limits and generic sql database url from environment variables', () => {
    process.env.WENJUAN_DEMO_MODE = 'true';
    process.env.DATABASE_URL = 'postgres://demo:demo@example.com:5432/wenjuan';
    process.env.WENJUAN_DEMO_MAX_SURVEYS_PER_VISITOR = '3';
    process.env.WENJUAN_DEMO_MAX_RESPONSES_PER_SURVEY = '12';
    process.env.WENJUAN_DEMO_AI_DAILY_LIMIT_PER_IP = '4';
    process.env.WENJUAN_DEMO_SUBMIT_HOURLY_LIMIT_PER_IP = '8';
    process.env.WENJUAN_DEMO_DATA_TTL_DAYS = '2';
    process.env.WENJUAN_DEMO_DB_USAGE_CLEANUP_THRESHOLD = '0.75';
    process.env.WENJUAN_DEMO_DB_MAX_BYTES = '500000000';

    expect(getDemoModeConfig()).toMatchObject({
      enabled: true,
      maxSurveysPerVisitor: 3,
      maxResponsesPerSurvey: 12,
      aiDailyLimitPerIp: 4,
      submitHourlyLimitPerIp: 8,
      dataTtlDays: 2,
      dbUsageCleanupThreshold: 0.75,
      dbMaxBytes: 500000000
    });
    expect(getDatabaseConfig()).toEqual({
      databaseUrl: 'postgres://demo:demo@example.com:5432/wenjuan'
    });
  });
});
