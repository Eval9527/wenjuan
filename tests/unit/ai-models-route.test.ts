import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/ai/models/route';

const AI_ENV_KEYS = [
  'WENJUAN_AI_BASE_URL',
  'WENJUAN_AI_API_KEY',
  'WENJUAN_AI_MODEL',
  'WENJUAN_AI_MODEL_ALIAS',
  'WENJUAN_AI_PROVIDER_ALIAS',
  'WENJUAN_AI_PROVIDERS_JSON'
] as const;

let originalEnv: Partial<Record<(typeof AI_ENV_KEYS)[number], string>>;

describe('GET /api/ai/models', () => {
  beforeEach(() => {
    originalEnv = {};
    for (const key of AI_ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    for (const key of AI_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
  });

  it('returns builtin-only metadata when no AI model is configured', async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      mode: 'builtin-only',
      defaultSelection: 'auto',
      showSelector: false,
      models: []
    });
  });

  it('returns safe multi-model metadata without leaking keys or base URLs', async () => {
    process.env.WENJUAN_AI_PROVIDERS_JSON = JSON.stringify([
      {
        id: 'local',
        alias: '本地服务',
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'secret-key',
        models: [
          { id: 'main', alias: '主模型', primary: true },
          { id: 'backup', alias: '备用模型' }
        ]
      }
    ]);

    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload).toEqual({
      mode: 'configured',
      defaultSelection: 'auto',
      showSelector: true,
      models: [
        { id: 'local:main', alias: '主模型', providerAlias: '本地服务', primary: true },
        { id: 'local:backup', alias: '备用模型', providerAlias: '本地服务', primary: false }
      ]
    });
    expect(JSON.stringify(payload)).not.toContain('secret-key');
    expect(JSON.stringify(payload)).not.toContain('localhost:4000');
  });
});
