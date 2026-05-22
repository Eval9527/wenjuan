import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { POST } from '@/app/api/ai/changes/route';
import type { SurveyDocument } from '@/features/survey-schema/schema';

const AI_ENV_KEYS = [
  'WENJUAN_AI_BASE_URL',
  'WENJUAN_AI_API_KEY',
  'WENJUAN_AI_MODEL',
  'WENJUAN_AI_MODEL_ALIAS',
  'WENJUAN_AI_PROVIDER_ALIAS',
  'WENJUAN_AI_PROVIDERS_JSON',
  'WENJUAN_AI_TIMEOUT_MS',
  'WENJUAN_AI_DEBUG'
] as const;
let originalEnv: Partial<Record<(typeof AI_ENV_KEYS)[number], string>>;

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

function createRequest(prompt: string, currentDocument = createDocument()) {
  return new Request('http://localhost/api/ai/changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, currentDocument })
  });
}

function createRequestWithModelSelection(prompt: string, modelSelection: string, currentDocument = createDocument()) {
  return new Request('http://localhost/api/ai/changes', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt, currentDocument, modelSelection })
  });
}

function setLocalAiEnv() {
  process.env.WENJUAN_AI_BASE_URL = 'http://localhost:4000/v1';
  process.env.WENJUAN_AI_API_KEY = 'test-local-key';
  process.env.WENJUAN_AI_MODEL = 'mimo-v2.5';
}

function buildCompletion(content: unknown) {
  return {
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: JSON.stringify(content)
          }
        }
      ]
    })
  } as Response;
}

describe('POST /api/ai/changes', () => {
  beforeEach(() => {
    originalEnv = {};
    for (const key of AI_ENV_KEYS) {
      originalEnv[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    vi.useRealTimers();
    for (const key of AI_ENV_KEYS) {
      if (originalEnv[key] === undefined) {
        delete process.env[key];
      } else {
        process.env[key] = originalEnv[key];
      }
    }
    vi.restoreAllMocks();
  });

  it('calls the configured local OpenAI-compatible model and converts its JSON draft into a preview changeset', async () => {
    setLocalAiEnv();
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '```json\n{"summary":"AI 生成活动报名问卷","title":"活动报名表","blocks":[{"type":"title","label":"活动报名表","level":1},{"type":"input","label":"姓名","required":true,"placeholder":"请输入姓名"},{"type":"singleChoice","label":"参与场次","options":["上午场","下午场"]}]}\n```'
            }
          }
        ]
      })
    } as Response);

    const response = await POST(createRequest('生成一个活动报名问卷，包含姓名和参与场次'));
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledWith(
      'http://localhost:4000/v1/chat/completions',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-local-key',
          'Content-Type': 'application/json'
        })
      })
    );
    const requestBody = JSON.parse(fetchMock.mock.calls[0][1]?.body as string);
    expect(requestBody.model).toBe('mimo-v2.5');
    expect(requestBody.stream).toBe(false);
    expect(requestBody.messages[1].content).toContain('生成一个活动报名问卷');
    expect(requestBody.messages[1].content).toContain('currentDocument');

    expect(response.status).toBe(200);
    expect(payload).toMatchObject({
      basedOnVersion: 1,
      userIntent: '生成一个活动报名问卷，包含姓名和参与场次',
      summary: 'AI 生成活动报名问卷'
    });
    expect(payload.nextDocument).toMatchObject({
      id: 'demo',
      title: '活动报名表',
      settings: { submitLabel: '提交' },
      meta: { version: 2 }
    });
    expect(payload.nextDocument.blocks).toHaveLength(3);
    expect(payload.nextDocument.blocks[0]).toMatchObject({
      type: 'title',
      label: '活动报名表',
      align: 'center'
    });
    expect(payload.nextDocument.blocks[1]).toMatchObject({
      type: 'input',
      label: '姓名',
      required: true,
      placeholder: '请输入姓名'
    });
    expect(payload.nextDocument.blocks[2]).toMatchObject({
      type: 'singleChoice',
      label: '参与场次',
      options: [
        expect.objectContaining({ text: '上午场' }),
        expect.objectContaining({ text: '下午场' })
      ]
    });
    expect(payload.operations).toHaveLength(3);
    expect(payload.operations.every((operation: { type: string }) => operation.type === 'addBlock')).toBe(true);
  });


  it('adds a visible title block for generated empty surveys when the AI only returns a global title', async () => {
    setLocalAiEnv();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'AI 生成线索收集问卷',
                title: '线索收集表',
                blocks: [
                  { type: 'input', label: '姓名', placeholder: '请输入姓名' }
                ]
              })
            }
          }
        ]
      })
    } as Response);

    const response = await POST(createRequest('生成一个线索收集问卷'));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.nextDocument.blocks).toHaveLength(2);
    expect(payload.nextDocument.blocks[0]).toMatchObject({
      type: 'title',
      label: '线索收集表',
      level: 1,
      align: 'center'
    });
    expect(payload.nextDocument.blocks[1]).toMatchObject({
      type: 'input',
      label: '姓名'
    });
  });

  it('keeps the deterministic demo generator when local AI config is absent', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    const response = await POST(createRequest('增加一个手机号填写框'));
    const payload = await response.json();

    expect(fetchMock).not.toHaveBeenCalled();
    expect(response.status).toBe(200);
    expect(payload.source).toBe('builtin');
    expect(payload.notice).toBe('当前未配置 AI 模型，这是内置生成器生成的。');
    expect(payload.summary).toBe('新增 1 个手机号填写题');
    expect(payload.nextDocument.blocks.at(-1)).toMatchObject({
      type: 'input',
      label: '手机号',
      placeholder: '请输入手机号'
    });
  });


  it('writes safe development logs for local ai calls when debug logging is enabled', async () => {
    setLocalAiEnv();
    process.env.WENJUAN_AI_DEBUG = '1';
    const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => undefined);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: 'AI 生成调研问卷',
                title: '调研问卷',
                blocks: [
                  { type: 'title', label: '调研问卷', level: 1 },
                  { type: 'input', label: '姓名' }
                ]
              })
            }
          }
        ]
      })
    } as Response);

    const response = await POST(createRequest('生成一个调研问卷'));

    expect(response.status).toBe(200);
    expect(infoSpy).toHaveBeenCalledWith('[wenjuan-ai]', expect.objectContaining({
      event: 'request',
      model: 'mimo-v2.5',
      documentId: 'demo',
      documentVersion: 1,
      blockCount: 0
    }));
    expect(infoSpy).toHaveBeenCalledWith('[wenjuan-ai]', expect.objectContaining({
      event: 'success',
      model: 'mimo-v2.5',
      operationCount: expect.any(Number),
      durationMs: expect.any(Number)
    }));
    expect(JSON.stringify(infoSpy.mock.calls)).not.toContain('test-local-key');
  });

  it('does not fall back to the deterministic generator when a configured local AI returns invalid JSON', async () => {
    setLocalAiEnv();
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [
          {
            message: {
              content: '我无法按 JSON 输出。'
            }
          }
        ]
      })
    } as Response);

    const response = await POST(createRequest('生成一个满意度问卷'));
    const payload = await response.json();

    expect(response.status).toBe(502);
    expect(payload).toEqual({
      error: 'AI 暂时没能生成修改建议，请稍后重试或换个说法。'
    });
  });

  it('uses auto mode by default, times out each model after 30s, and switches models up to three times', async () => {
    vi.useFakeTimers();
    process.env.WENJUAN_AI_PROVIDERS_JSON = JSON.stringify([
      {
        id: 'local',
        alias: '本地服务',
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'test-local-key',
        models: [
          { id: 'main', alias: '主模型', primary: true },
          { id: 'backup-a', alias: '备用 A' },
          { id: 'backup-b', alias: '备用 B' },
          { id: 'backup-c', alias: '备用 C' }
        ]
      }
    ]);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => {
      const body = JSON.parse(String((init as RequestInit).body));

      if (body.model === 'backup-c') {
        return Promise.resolve(buildCompletion({
          summary: '备用模型生成问卷',
          title: '自动切换成功',
          blocks: [{ type: 'title', label: '自动切换成功', level: 1 }]
        }));
      }

      return new Promise<Response>((_, reject) => {
        (init as RequestInit).signal?.addEventListener('abort', () => {
          reject(new DOMException('Aborted', 'AbortError'));
        });
      });
    });

    const responsePromise = POST(createRequest('生成一个问卷'));
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    const response = await responsePromise;
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    expect(fetchMock.mock.calls.map((call) => JSON.parse(String(call[1]?.body)).model)).toEqual([
      'main',
      'backup-a',
      'backup-b',
      'backup-c'
    ]);
    expect(payload.summary).toBe('备用模型生成问卷');
    expect(payload.modelAlias).toBe('备用 C');
    expect(payload.timedOutModels).toEqual(['主模型', '备用 A', '备用 B']);
  });

  it('returns an auto-mode timeout message after three model switches still time out', async () => {
    vi.useFakeTimers();
    process.env.WENJUAN_AI_PROVIDERS_JSON = JSON.stringify([
      {
        id: 'local',
        alias: '本地服务',
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'test-local-key',
        models: [
          { id: 'main', alias: '主模型', primary: true },
          { id: 'backup-a', alias: '备用 A' },
          { id: 'backup-b', alias: '备用 B' },
          { id: 'backup-c', alias: '备用 C' },
          { id: 'backup-d', alias: '备用 D' }
        ]
      }
    ]);
    vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => new Promise<Response>((_, reject) => {
      (init as RequestInit).signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }));

    const responsePromise = POST(createRequestWithModelSelection('生成一个问卷', 'auto'));
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    await vi.advanceTimersByTimeAsync(30_000);
    const response = await responsePromise;
    const payload = await response.json();

    expect(response.status).toBe(504);
    expect(payload).toEqual({
      error: 'auto 模式连续切换模型仍超时，请稍后重试或选择具体模型。'
    });
  });

  it('uses a 60s timeout for an explicitly selected model and suggests auto mode on timeout', async () => {
    vi.useFakeTimers();
    process.env.WENJUAN_AI_PROVIDERS_JSON = JSON.stringify([
      {
        id: 'local',
        alias: '本地服务',
        baseUrl: 'http://localhost:4000/v1',
        apiKey: 'test-local-key',
        models: [
          { id: 'main', alias: '主模型', primary: true },
          { id: 'backup', alias: '备用模型' }
        ]
      }
    ]);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation((_, init) => new Promise<Response>((_, reject) => {
      (init as RequestInit).signal?.addEventListener('abort', () => {
        reject(new DOMException('Aborted', 'AbortError'));
      });
    }));

    const responsePromise = POST(createRequestWithModelSelection('生成一个问卷', 'local:backup'));
    await vi.advanceTimersByTimeAsync(59_000);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(1_000);
    const response = await responsePromise;
    const payload = await response.json();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(504);
    expect(payload).toEqual({
      error: '当前模型响应超时，可以切换到 auto 模式或稍后重试。'
    });
  });
});
