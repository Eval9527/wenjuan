import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import {
  getAiModelCandidates,
  getPublicAiModelOptions,
  setAiModelConfigFilePathForTests
} from '@/features/ai-assistant/model-config';

afterEach(() => {
  setAiModelConfigFilePathForTests(null);
});

function writeAiConfig(payload: unknown) {
  const dir = mkdtempSync(join(tmpdir(), 'wenjuan-ai-config-'));
  const configPath = join(dir, 'ai-models.local.json');
  writeFileSync(configPath, JSON.stringify(payload));
  setAiModelConfigFilePathForTests(configPath);
  return configPath;
}

describe('ai model config', () => {
  it('loads OpenClaw/Hermes-style multi-site JSON config files with notes, custom headers, and timeouts', () => {
    writeAiConfig({
      _notes: [
        'Only config/ai-models.local.json is used for AI models.',
        'timeoutMs can be set at root, provider, or model level.'
      ],
      autoTimeoutMs: 31_000,
      singleTimeoutMs: 61_000,
      providers: [
        {
          _notes: 'A local OpenAI-compatible endpoint can expose many models.',
          id: 'local',
          alias: '本地 Hermes',
          api: 'openai-completions',
          apiKey: 'local-key',
          baseUrl: 'http://localhost:4000/v1',
          headers: {
            'User-Agent': 'Wenjuan Demo',
            'X-Client': 'wenjuan'
          },
          models: [
            { id: 'mimo-v2.5', alias: 'Mimo 主模型', primary: true, autoTimeoutMs: 35_000 },
            'qwen2.5'
          ]
        },
        {
          id: 'cloud',
          alias: '云端备用',
          api: 'openai-completions',
          apiKey: 'cloud-key',
          baseUrl: 'https://ai.example.test/v1',
          timeoutMs: 45_000,
          models: [
            { id: 'deepseek-chat', alias: 'DeepSeek 备用' }
          ]
        }
      ]
    });

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
      alias: 'qwen2.5',
      providerAlias: '本地 Hermes',
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

  it('also accepts a single-site JSON config object', () => {
    writeAiConfig({
      id: 'solo',
      alias: '单站点',
      api: 'openai-completions',
      apiKey: 'solo-key',
      baseUrl: 'http://localhost:4000/v1',
      models: [{ id: 'solo-model', alias: 'Solo 模型' }]
    });

    const publicOptions = getPublicAiModelOptions();

    expect(publicOptions).toEqual({
      mode: 'configured',
      defaultSelection: 'solo:solo-model',
      showSelector: false,
      models: [
        { id: 'solo:solo-model', alias: 'Solo 模型', providerAlias: '单站点', primary: false }
      ]
    });
    expect(JSON.stringify(publicOptions)).not.toContain('solo-key');
    expect(JSON.stringify(publicOptions)).not.toContain('localhost:4000');
  });

  it('only exposes safe public model metadata to the frontend', () => {
    writeAiConfig({
      providers: [
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
      ]
    });

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

  it('reports builtin-only mode when the local config file is missing', () => {
    setAiModelConfigFilePathForTests(join(tmpdir(), 'missing-ai-models.local.json'));

    expect(getPublicAiModelOptions()).toEqual({
      mode: 'builtin-only',
      defaultSelection: 'auto',
      showSelector: false,
      models: []
    });
  });
});
