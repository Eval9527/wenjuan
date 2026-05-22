import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useSqlTestDatabase } from '../helpers/sql-test-db';
import { POST as postAiChanges } from '@/app/api/ai/changes/route';
import { POST as postSurvey } from '@/app/api/surveys/route';
import { POST as postResponse } from '@/app/api/surveys/[surveyId]/responses/route';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { publishSurveyDraft, saveSurveyDraft } from '@/features/persistence/repository';
import type { SurveyDocument } from '@/features/survey-schema/schema';

const DEMO_ENV_KEYS = [
  'WENJUAN_DEMO_MODE',
  'WENJUAN_DEMO_VISITOR_SECRET',
  'WENJUAN_DEMO_IP_HASH_SECRET',
  'WENJUAN_DEMO_AI_DAILY_LIMIT_PER_IP',
  'WENJUAN_DEMO_SUBMIT_HOURLY_LIMIT_PER_IP',
  'WENJUAN_DEMO_MAX_SURVEYS_PER_VISITOR',
  'WENJUAN_DEMO_MAX_RESPONSES_PER_SURVEY'
] as const;

function createDocument(): SurveyDocument {
  return {
    id: 'demo',
    title: '未命名问卷',
    blocks: [],
    settings: { submitLabel: '提交' },
    meta: {
      version: 1,
      createdAt: '2026-04-13T00:00:00.000Z',
      updatedAt: '2026-04-13T00:00:00.000Z'
    }
  };
}

function createDemoHeaders(cookie?: string) {
  return {
    'content-type': 'application/json',
    'cf-connecting-ip': '203.0.113.10',
    ...(cookie ? { cookie } : {})
  };
}

describe('demo mode route quotas', () => {
  useSqlTestDatabase();

  beforeEach(() => {
    process.env.WENJUAN_DEMO_MODE = 'true';
    process.env.WENJUAN_DEMO_VISITOR_SECRET = 'visitor-secret-for-route-tests';
    process.env.WENJUAN_DEMO_IP_HASH_SECRET = 'ip-secret-for-route-tests';
  });

  afterEach(() => {
    for (const key of DEMO_ENV_KEYS) {
      delete process.env[key];
    }
  });

  it('limits AI changes per IP per day and returns a visitor cookie', async () => {
    process.env.WENJUAN_DEMO_AI_DAILY_LIMIT_PER_IP = '1';

    const first = await postAiChanges(new Request('http://localhost/api/ai/changes', {
      method: 'POST',
      headers: createDemoHeaders(),
      body: JSON.stringify({ prompt: '增加手机号', currentDocument: createDocument() })
    }));
    const cookie = first.headers.get('set-cookie');

    expect(first.status).toBe(200);
    expect(cookie).toContain('wenjuan_demo_visitor=');

    const second = await postAiChanges(new Request('http://localhost/api/ai/changes', {
      method: 'POST',
      headers: createDemoHeaders(cookie ?? undefined),
      body: JSON.stringify({ prompt: '再增加邮箱', currentDocument: createDocument() })
    }));
    const payload = await second.json();

    expect(second.status).toBe(429);
    expect(payload.error).toBe('演示站今日 AI 额度已用完，请明天再试，或克隆项目本地配置自己的模型。');
  });

  it('limits survey creation per signed visitor', async () => {
    process.env.WENJUAN_DEMO_MAX_SURVEYS_PER_VISITOR = '1';

    const first = await postSurvey(new Request('http://localhost/api/surveys', {
      method: 'POST',
      headers: createDemoHeaders(),
      body: JSON.stringify({})
    }));
    const cookie = first.headers.get('set-cookie');

    expect(first.status).toBe(201);
    expect(cookie).toContain('wenjuan_demo_visitor=');

    const second = await postSurvey(new Request('http://localhost/api/surveys', {
      method: 'POST',
      headers: createDemoHeaders(cookie ?? undefined),
      body: JSON.stringify({})
    }));
    const payload = await second.json();

    expect(second.status).toBe(429);
    expect(payload.error).toBe('演示站创建问卷数量已达上限，可以复制项目到本地继续使用。');
  });

  it('limits response submissions per IP per hour', async () => {
    process.env.WENJUAN_DEMO_SUBMIT_HOURLY_LIMIT_PER_IP = '1';
    process.env.WENJUAN_DEMO_MAX_RESPONSES_PER_SURVEY = '50';
    const survey = createEmptySurvey({ id: 'demo' });
    await saveSurveyDraft({ surveyId: 'demo', version: 1, document: survey });
    await publishSurveyDraft('demo');

    const first = await postResponse(new Request('http://localhost/api/surveys/demo/responses', {
      method: 'POST',
      headers: createDemoHeaders(),
      body: JSON.stringify({ answers: { name: 'A' } })
    }), { params: Promise.resolve({ surveyId: 'demo' }) });
    const cookie = first.headers.get('set-cookie');

    expect(first.status).toBe(200);
    expect(cookie).toContain('wenjuan_demo_visitor=');

    const second = await postResponse(new Request('http://localhost/api/surveys/demo/responses', {
      method: 'POST',
      headers: createDemoHeaders(cookie ?? undefined),
      body: JSON.stringify({ answers: { name: 'B' } })
    }), { params: Promise.resolve({ surveyId: 'demo' }) });
    const payload = await second.json();

    expect(second.status).toBe(429);
    expect(payload.error).toBe('演示站提交过于频繁，请稍后再试。');
  });

  it('limits total responses per survey in demo mode', async () => {
    process.env.WENJUAN_DEMO_SUBMIT_HOURLY_LIMIT_PER_IP = '20';
    process.env.WENJUAN_DEMO_MAX_RESPONSES_PER_SURVEY = '1';
    const survey = createEmptySurvey({ id: 'limited' });
    await saveSurveyDraft({ surveyId: 'limited', version: 1, document: survey });
    await publishSurveyDraft('limited');

    const first = await postResponse(new Request('http://localhost/api/surveys/limited/responses', {
      method: 'POST',
      headers: createDemoHeaders(),
      body: JSON.stringify({ answers: { name: 'A' } })
    }), { params: Promise.resolve({ surveyId: 'limited' }) });

    expect(first.status).toBe(200);

    const second = await postResponse(new Request('http://localhost/api/surveys/limited/responses', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'cf-connecting-ip': '203.0.113.11'
      },
      body: JSON.stringify({ answers: { name: 'B' } })
    }), { params: Promise.resolve({ surveyId: 'limited' }) });
    const payload = await second.json();

    expect(second.status).toBe(429);
    expect(payload.error).toBe('当前问卷已达到演示站答卷上限。');
  });
});
