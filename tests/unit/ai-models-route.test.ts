import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { GET } from '@/app/api/ai/models/route';
import { setAiModelCatalogForTests } from '@/features/ai-assistant/model-config';
import type { AiModelCatalog } from '@/features/ai-assistant/model-catalog';

const TEST_AI_ENV_KEYS = ['TEST_LOCAL_AI_KEY'] as const;
let originalEnv: Partial<Record<(typeof TEST_AI_ENV_KEYS)[number], string>>;

beforeEach(() => {
  originalEnv = {};
  for (const key of TEST_AI_ENV_KEYS) {
    originalEnv[key] = process.env[key];
    delete process.env[key];
  }
  setAiModelCatalogForTests([]);
});

afterEach(() => {
  for (const key of TEST_AI_ENV_KEYS) {
    if (originalEnv[key] === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = originalEnv[key];
    }
  }
  setAiModelCatalogForTests(null);
});

function setCatalog(catalog: AiModelCatalog) {
  setAiModelCatalogForTests(catalog);
}

describe('GET /api/ai/models', () => {
  it('returns builtin-only metadata when catalog keys are missing', async () => {
    setCatalog([
      {
        id: 'local',
        alias: '本地服务',
        baseUrl: 'http://localhost:4000/v1',
        apiKeyEnv: 'TEST_LOCAL_AI_KEY',
        models: [{ id: 'main', alias: '主模型', primary: true }]
      }
    ]);

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

  it('returns safe multi-model metadata from the TypeScript catalog without leaking keys or base URLs', async () => {
    setCatalog([
      {
        id: 'local',
        alias: '本地服务',
        baseUrl: 'http://localhost:4000/v1',
        apiKeyEnv: 'TEST_LOCAL_AI_KEY',
        models: [
          { id: 'main', alias: '主模型', primary: true },
          { id: 'backup', alias: '备用模型' }
        ]
      }
    ]);
    process.env.TEST_LOCAL_AI_KEY = 'secret-key';

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
