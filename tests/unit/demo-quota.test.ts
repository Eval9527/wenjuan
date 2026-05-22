import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  DemoQuotaExceededError,
  assertAiQuota,
  assertSubmitQuota,
  assertSurveyCreateQuota,
  createMemoryDemoUsageStore,
  recordAiUsage,
  recordSubmitUsage,
  recordSurveyCreateUsage
} from '@/features/demo-mode/quota';

const now = new Date('2026-05-22T10:00:00.000Z');

describe('demo quota policy', () => {
  beforeEach(() => {
    process.env.WENJUAN_DEMO_MODE = 'true';
    process.env.WENJUAN_DEMO_AI_DAILY_LIMIT_PER_IP = '1';
    process.env.WENJUAN_DEMO_SUBMIT_HOURLY_LIMIT_PER_IP = '1';
    process.env.WENJUAN_DEMO_MAX_SURVEYS_PER_VISITOR = '1';
  });

  afterEach(() => {
    delete process.env.WENJUAN_DEMO_MODE;
    delete process.env.WENJUAN_DEMO_AI_DAILY_LIMIT_PER_IP;
    delete process.env.WENJUAN_DEMO_SUBMIT_HOURLY_LIMIT_PER_IP;
    delete process.env.WENJUAN_DEMO_MAX_SURVEYS_PER_VISITOR;
  });

  it('enforces daily AI usage by hashed IP', async () => {
    const store = createMemoryDemoUsageStore();
    await assertAiQuota({ store, ipHash: 'ip_a', now });
    await recordAiUsage({ store, ipHash: 'ip_a', visitorId: 'vis_a', now });

    await expect(assertAiQuota({ store, ipHash: 'ip_a', now })).rejects.toMatchObject({
      code: 'AI_DAILY_LIMIT',
      status: 429,
      userMessage: '演示站今日 AI 额度已用完，请明天再试，或克隆项目本地配置自己的模型。'
    } satisfies Partial<DemoQuotaExceededError>);
  });

  it('enforces hourly submit usage by hashed IP', async () => {
    const store = createMemoryDemoUsageStore();
    await assertSubmitQuota({ store, ipHash: 'ip_submit', visitorId: 'vis_a', surveyId: 'wj-1', now });
    await recordSubmitUsage({ store, ipHash: 'ip_submit', visitorId: 'vis_a', surveyId: 'wj-1', now });

    await expect(assertSubmitQuota({ store, ipHash: 'ip_submit', visitorId: 'vis_a', surveyId: 'wj-1', now })).rejects.toMatchObject({
      code: 'SUBMIT_HOURLY_LIMIT',
      status: 429,
      userMessage: '演示站提交过于频繁，请稍后再试。'
    } satisfies Partial<DemoQuotaExceededError>);
  });

  it('enforces survey creation usage by signed visitor', async () => {
    const store = createMemoryDemoUsageStore();
    await assertSurveyCreateQuota({ store, visitorId: 'vis_creator', now });
    await recordSurveyCreateUsage({ store, visitorId: 'vis_creator', ipHash: 'ip_a', surveyId: 'wj-created', now });

    await expect(assertSurveyCreateQuota({ store, visitorId: 'vis_creator', now })).rejects.toMatchObject({
      code: 'SURVEY_CREATE_LIMIT',
      status: 429,
      userMessage: '演示站创建问卷数量已达上限，可以复制项目到本地继续使用。'
    } satisfies Partial<DemoQuotaExceededError>);
  });
});
