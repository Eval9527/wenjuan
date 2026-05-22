import { describe, expect, it } from 'vitest';
import {
  getAiModelCandidates,
  getPublicAiModelOptions
} from '@/features/ai-assistant/model-config';

describe('ai model config', () => {
  it('keeps the legacy single-model env as one selectable candidate', () => {
    const candidates = getAiModelCandidates({
      WENJUAN_AI_BASE_URL: 'http://localhost:4000/v1/',
      WENJUAN_AI_API_KEY: 'legacy-key',
      WENJUAN_AI_MODEL: 'mimo-v2.5',
      WENJUAN_AI_MODEL_ALIAS: 'Mimo 主模型',
      WENJUAN_AI_PROVIDER_ALIAS: '本地模型'
    } as unknown as NodeJS.ProcessEnv);

    expect(candidates).toEqual([
      expect.objectContaining({
        id: 'legacy:mimo-v2.5',
        alias: 'Mimo 主模型',
        providerAlias: '本地模型',
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'legacy-key',
        model: 'mimo-v2.5',
        primary: true
      })
    ]);
  });

  it('expands multiple providers and models while keeping primary models first', () => {
    const candidates = getAiModelCandidates({
      WENJUAN_AI_PROVIDERS_JSON: JSON.stringify([
        {
          id: 'local',
          alias: '本地服务',
          baseUrl: 'http://localhost:4000/v1',
          apiKey: 'local-key',
          models: [
            { id: 'backup-local', alias: '本地备用' },
            { id: 'primary-local', alias: '本地主模型', primary: true }
          ]
        },
        {
          id: 'remote',
          alias: '备用服务',
          baseUrl: 'https://ai.example.test/v1/',
          apiKey: 'remote-key',
          models: [
            { id: 'remote-a', alias: '远端 A' }
          ]
        }
      ])
    } as unknown as NodeJS.ProcessEnv);

    expect(candidates.map((candidate) => candidate.id)).toEqual([
      'local:primary-local',
      'local:backup-local',
      'remote:remote-a'
    ]);
    expect(candidates[2]).toMatchObject({
      alias: '远端 A',
      providerAlias: '备用服务',
      baseUrl: 'https://ai.example.test/v1',
      apiKey: 'remote-key'
    });
  });

  it('only exposes safe public model metadata to the frontend', () => {
    const publicOptions = getPublicAiModelOptions({
      WENJUAN_AI_PROVIDERS_JSON: JSON.stringify([
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
      ])
    } as unknown as NodeJS.ProcessEnv);

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

  it('reports builtin-only mode when no model is configured', () => {
    expect(getPublicAiModelOptions({} as NodeJS.ProcessEnv)).toEqual({
      mode: 'builtin-only',
      defaultSelection: 'auto',
      showSelector: false,
      models: []
    });
  });
});
