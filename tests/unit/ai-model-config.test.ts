import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getAiModelCandidates,
  getPublicAiModelOptions,
  setAiModelCatalogForTests
} from '@/features/ai-assistant/model-config';
import { aiModelCatalog, type AiModelCatalog } from '@/features/ai-assistant/model-catalog';

const TEST_AI_ENV_KEYS = [
  'TEST_LOCAL_AI_KEY',
  'TEST_LOCAL_AI_BASE_URL',
  'TEST_CLOUD_AI_KEY'
] as const;
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

describe('ai model config', () => {
  it('orders high-quota free models across Google and BigModel providers', () => {
    setAiModelCatalogForTests(null);

    const candidates = getAiModelCandidates({
      WENJUAN_AI_GOOGLE_API_KEY: 'google-key',
      WENJUAN_AI_BIGMODEL_API_KEY: 'bigmodel-key'
    });

    expect(aiModelCatalog).toHaveLength(3);
    expect(candidates).toMatchObject([
      {
        id: 'google:gemini-3.1-flash-lite',
        alias: 'Gemini 3.1 Flash-Lite',
        providerAlias: 'Google AI',
        api: 'google-generate-content',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemini-3.1-flash-lite',
        primary: true
      },
      {
        id: 'bigmodel:glm-4-flash-250414',
        alias: 'GLM-4-Flash-250414',
        providerAlias: '智谱 AI',
        api: 'openai-completions',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4-flash-250414',
        primary: false
      },
      {
        id: 'gemma:gemma-4-31b-it',
        alias: 'Gemma 4 31B',
        providerAlias: 'Google AI',
        api: 'google-generate-content',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemma-4-31b-it',
        primary: false
      },
      {
        id: 'gemma:gemma-4-26b-a4b-it',
        alias: 'Gemma 4 26B',
        providerAlias: 'Google AI',
        api: 'google-generate-content',
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta',
        model: 'gemma-4-26b-a4b-it',
        primary: false
      }
    ]);
  });

  it('loads OpenAI-compatible model candidates from the TypeScript catalog and reads only secrets from env', () => {
    setCatalog([
      {
        id: 'local',
        alias: '本地 Hermes',
        api: 'openai-completions',
        apiKeyEnv: 'TEST_LOCAL_AI_KEY',
        baseUrlEnv: 'TEST_LOCAL_AI_BASE_URL',
        headers: {
          'User-Agent': 'Wenjuan Demo',
          'X-Client': 'wenjuan'
        },
        autoTimeoutMs: 31_000,
        singleTimeoutMs: 61_000,
        models: [
          { id: 'mimo-v2.5', alias: 'Mimo 主模型', primary: true, autoTimeoutMs: 35_000 },
          { id: 'qwen2.5', alias: 'Qwen 备用' }
        ]
      },
      {
        id: 'cloud',
        alias: '云端备用',
        api: 'openai-completions',
        apiKeyEnv: 'TEST_CLOUD_AI_KEY',
        baseUrl: 'https://ai.example.test/v1',
        timeoutMs: 45_000,
        models: [
          { id: 'deepseek-chat', alias: 'DeepSeek 备用' }
        ]
      }
    ]);
    process.env.TEST_LOCAL_AI_KEY = 'local-key';
    process.env.TEST_LOCAL_AI_BASE_URL = 'http://localhost:4000/v1';
    process.env.TEST_CLOUD_AI_KEY = 'cloud-key';

    const candidates = getAiModelCandidates();

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      'local:mimo-v2.5',
      'local:qwen2.5',
      'cloud:deepseek-chat'
    ]);
    expect(candidates[0]).toMatchObject({
      alias: 'Mimo 主模型',
      providerAlias: '本地 Hermes',
      api: 'openai-completions',
      apiKey: 'local-key',
      baseUrl: 'http://localhost:4000/v1',
      headers: {
        'User-Agent': 'Wenjuan Demo',
        'X-Client': 'wenjuan'
      },
      model: 'mimo-v2.5',
      primary: true,
      autoTimeoutMs: 35_000,
      singleTimeoutMs: 61_000
    });
    expect(candidates[1]).toMatchObject({
      alias: 'Qwen 备用',
      providerAlias: '本地 Hermes',
      apiKey: 'local-key',
      model: 'qwen2.5',
      autoTimeoutMs: 31_000,
      singleTimeoutMs: 61_000
    });
    expect(candidates[2]).toMatchObject({
      alias: 'DeepSeek 备用',
      providerAlias: '云端备用',
      apiKey: 'cloud-key',
      baseUrl: 'https://ai.example.test/v1',
      autoTimeoutMs: 45_000,
      singleTimeoutMs: 45_000
    });
  });

  it('skips catalog providers whose apiKeyEnv is not configured', () => {
    setCatalog([
      {
        id: 'local',
        alias: '本地服务',
        baseUrl: 'http://localhost:4000/v1',
        apiKeyEnv: 'TEST_LOCAL_AI_KEY',
        models: [
          { id: 'main', alias: '主模型', primary: true }
        ]
      },
      {
        id: 'cloud',
        alias: '云端备用',
        baseUrl: 'https://ai.example.test/v1',
        apiKeyEnv: 'TEST_CLOUD_AI_KEY',
        models: [
          { id: 'backup', alias: '备用模型' }
        ]
      }
    ]);
    process.env.TEST_LOCAL_AI_KEY = 'local-key';

    expect(getAiModelCandidates().map((candidate) => candidate.id)).toEqual(['local:main']);
  });

  it('skips catalog providers whose baseUrlEnv is not configured', () => {
    setCatalog([
      {
        id: 'local',
        alias: '本地服务',
        baseUrlEnv: 'TEST_LOCAL_AI_BASE_URL',
        apiKeyEnv: 'TEST_LOCAL_AI_KEY',
        models: [
          { id: 'main', alias: '主模型', primary: true }
        ]
      }
    ]);
    process.env.TEST_LOCAL_AI_KEY = 'local-key';

    expect(getAiModelCandidates()).toEqual([]);
  });

  it('only exposes safe public model metadata to the frontend', () => {
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

    const publicOptions = getPublicAiModelOptions();

    expect(publicOptions).toEqual({
      mode: 'configured',
      defaultSelection: 'auto',
      showSelector: true,
      models: [
        { id: 'local:main', alias: '主模型', providerAlias: '本地服务', primary: true },
        { id: 'local:backup', alias: '备用模型', providerAlias: '本地服务', primary: false }
      ]
    });
    expect(JSON.stringify(publicOptions)).not.toContain('secret-key');
    expect(JSON.stringify(publicOptions)).not.toContain('localhost:4000');
  });

  it('reports builtin-only mode when no catalog provider has a configured key', () => {
    setCatalog([
      {
        id: 'local',
        alias: '本地服务',
        baseUrl: 'http://localhost:4000/v1',
        apiKeyEnv: 'TEST_LOCAL_AI_KEY',
        models: [
          { id: 'main', alias: '主模型', primary: true }
        ]
      }
    ]);

    expect(getPublicAiModelOptions()).toEqual({
      mode: 'builtin-only',
      defaultSelection: 'auto',
      showSelector: false,
      models: []
    });
  });
});
