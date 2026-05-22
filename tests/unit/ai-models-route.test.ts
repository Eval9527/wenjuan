import { afterEach, describe, expect, it } from 'vitest';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { GET } from '@/app/api/ai/models/route';
import { setAiModelConfigFilePathForTests } from '@/features/ai-assistant/model-config';

afterEach(() => {
  setAiModelConfigFilePathForTests(null);
});

function writeAiConfig(payload: unknown) {
  const dir = mkdtempSync(join(tmpdir(), 'wenjuan-ai-models-route-'));
  const configPath = join(dir, 'ai-models.local.json');
  writeFileSync(configPath, JSON.stringify(payload));
  setAiModelConfigFilePathForTests(configPath);
}

describe('GET /api/ai/models', () => {
  it('returns builtin-only metadata when the local AI config file is missing', async () => {
    setAiModelConfigFilePathForTests(join(tmpdir(), 'missing-ai-models.local.json'));

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
