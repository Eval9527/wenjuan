export type DemoModeConfig = {
  enabled: boolean;
  maxSurveysPerVisitor: number;
  maxResponsesPerSurvey: number;
  aiDailyLimitPerIp: number;
  submitHourlyLimitPerIp: number;
  dataTtlDays: number;
  dbUsageCleanupThreshold: number;
  dbMaxBytes: number | null;
};

function parseBoolean(value: string | undefined) {
  return ['1', 'true', 'yes', 'on'].includes((value ?? '').trim().toLowerCase());
}

function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function parseRatio(value: string | undefined, fallback: number) {
  const parsed = Number.parseFloat(value ?? '');
  return Number.isFinite(parsed) && parsed > 0 && parsed <= 1 ? parsed : fallback;
}

function parseOptionalPositiveInteger(value: string | undefined) {
  const parsed = Number.parseInt(value ?? '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
}

export function getDemoModeConfig(): DemoModeConfig {
  return {
    enabled: parseBoolean(process.env.WENJUAN_DEMO_MODE),
    maxSurveysPerVisitor: parsePositiveInteger(process.env.WENJUAN_DEMO_MAX_SURVEYS_PER_VISITOR, 5),
    maxResponsesPerSurvey: parsePositiveInteger(process.env.WENJUAN_DEMO_MAX_RESPONSES_PER_SURVEY, 50),
    aiDailyLimitPerIp: parsePositiveInteger(process.env.WENJUAN_DEMO_AI_DAILY_LIMIT_PER_IP, 10),
    submitHourlyLimitPerIp: parsePositiveInteger(process.env.WENJUAN_DEMO_SUBMIT_HOURLY_LIMIT_PER_IP, 20),
    dataTtlDays: parsePositiveInteger(process.env.WENJUAN_DEMO_DATA_TTL_DAYS, 7),
    dbUsageCleanupThreshold: parseRatio(process.env.WENJUAN_DEMO_DB_USAGE_CLEANUP_THRESHOLD, 0.9),
    dbMaxBytes: parseOptionalPositiveInteger(process.env.WENJUAN_DEMO_DB_MAX_BYTES)
  };
}

export function isDemoMode() {
  return getDemoModeConfig().enabled;
}

export function getDatabaseConfig() {
  const databaseUrl = process.env.DATABASE_URL?.trim();

  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required for Wenjuan SQL storage');
  }

  return { databaseUrl };
}
