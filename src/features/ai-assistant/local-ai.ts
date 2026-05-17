import { z } from 'zod';
import { aiDraftChangeSetSchema, type AiDraftChangeSet, type ChangeOperation } from './types';
import {
  surveyDocumentSchema,
  type ChoiceOption,
  type MultiChoiceBlock,
  type SingleChoiceBlock,
  type SurveyBlock,
  type SurveyDocument
} from '@/features/survey-schema/schema';

const AI_CONFIG_KEYS = {
  baseUrl: 'WENJUAN_AI_BASE_URL',
  apiKey: 'WENJUAN_AI_API_KEY',
  model: 'WENJUAN_AI_MODEL',
  timeoutMs: 'WENJUAN_AI_TIMEOUT_MS'
} as const;

const blockDraftSchema = z.object({
  id: z.string().optional(),
  existingId: z.string().optional(),
  type: z.enum(['title', 'paragraph', 'input', 'singleChoice', 'multiChoice']),
  label: z.string().optional(),
  content: z.string().optional(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.string()]).optional(),
  align: z.enum(['left', 'center', 'right']).optional(),
  description: z.string().optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional(),
  options: z.array(z.union([
    z.string(),
    z.object({ id: z.string().optional(), text: z.string().optional(), label: z.string().optional() })
  ])).optional()
});

const aiSurveyDraftSchema = z.object({
  summary: z.string().optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  submitLabel: z.string().optional(),
  blocks: z.array(blockDraftSchema).min(1)
});

const openAiChatCompletionSchema = z.object({
  choices: z.array(z.object({
    message: z.object({
      content: z.union([
        z.string(),
        z.array(z.object({
          type: z.string().optional(),
          text: z.string().optional()
        }))
      ]).nullable().optional()
    }).optional()
  })).min(1)
});

type AiSurveyDraft = z.infer<typeof aiSurveyDraftSchema>;
type BlockDraft = z.infer<typeof blockDraftSchema>;

type LocalAiConfig = {
  baseUrl: string;
  apiKey: string;
  model: string;
  timeoutMs: number;
  debug: boolean;
};

export class LocalAiError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LocalAiError';
  }
}

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function nonEmptyString(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value.trim() : fallback;
}

function optionalNonEmptyString(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function normalizeBaseUrl(baseUrl: string) {
  return baseUrl.replace(/\/+$/, '');
}

function isDebugEnabled(value: string | undefined) {
  return value === '1' || value?.toLowerCase() === 'true';
}

function createAiRequestId() {
  return `ai-${Date.now().toString(36)}-${crypto.randomUUID().slice(0, 8)}`;
}

function logAiDebug(config: LocalAiConfig, payload: Record<string, unknown>) {
  if (!config.debug) {
    return;
  }

  console.info('[wenjuan-ai]', payload);
}

export function getLocalAiConfig(env: NodeJS.ProcessEnv = process.env): LocalAiConfig | null {
  const baseUrl = env[AI_CONFIG_KEYS.baseUrl]?.trim();
  const apiKey = env[AI_CONFIG_KEYS.apiKey]?.trim();
  const model = env[AI_CONFIG_KEYS.model]?.trim();

  if (!baseUrl || !apiKey || !model) {
    return null;
  }

  const parsedTimeout = Number(env[AI_CONFIG_KEYS.timeoutMs]);

  return {
    baseUrl: normalizeBaseUrl(baseUrl),
    apiKey,
    model,
    timeoutMs: Number.isFinite(parsedTimeout) && parsedTimeout > 0 ? parsedTimeout : 45_000,
    debug: isDebugEnabled(env.WENJUAN_AI_DEBUG)
  };
}

function buildSystemPrompt() {
  return [
    '你是 Wenjuan AI-first 问卷编辑器的问卷设计助手。',
    '你的任务是根据用户指令和 currentDocument，输出一份“建议后的问卷草稿”。',
    '只输出 JSON，不要输出 Markdown、解释、寒暄或额外文本。',
    'JSON 结构必须是：',
    '{"summary":"一句中文总结","title":"问卷标题","description":"可选问卷说明","submitLabel":"提交按钮文案","blocks":[...]}',
    'blocks 只允许以下 type：title、paragraph、input、singleChoice、multiChoice。',
    'title 使用 label 和 level(1/2/3)，paragraph 使用 content，input 使用 label/placeholder/required，选择题使用 label/options。',
    'options 可以是字符串数组，也可以是 {"text":"选项文案"} 数组。',
    '如果修改已有题目，尽量保留已有题目的 id 或放在 existingId 中；新增题目可以不写 id。',
    '不要直接删除问卷 id、settings 或 meta；系统会在服务端补齐这些字段。',
    '必须返回至少 1 个 block，并保持中文文案自然、短、明确。'
  ].join('\n');
}

function buildUserPrompt(prompt: string, currentDocument: SurveyDocument) {
  return JSON.stringify({
    prompt,
    currentDocument,
    constraints: {
      flow: 'AI 结果必须先成为 changeset preview，用户点击应用后才会写入编辑器。',
      allowedBlockTypes: ['title', 'paragraph', 'input', 'singleChoice', 'multiChoice'],
      uiLanguage: 'zh-CN'
    }
  }, null, 2);
}

function normalizeCompletionContent(content: unknown) {
  if (typeof content === 'string') {
    return content;
  }

  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (part && typeof part === 'object' && 'text' in part) {
          return typeof part.text === 'string' ? part.text : '';
        }
        return '';
      })
      .join('');
  }

  return '';
}

function extractJsonObject(text: string) {
  const trimmed = text.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  const withoutFence = fencedMatch?.[1]?.trim() ?? trimmed;
  const start = withoutFence.indexOf('{');
  const end = withoutFence.lastIndexOf('}');

  if (start === -1 || end === -1 || end <= start) {
    throw new LocalAiError('本地 AI 没有返回 JSON 对象');
  }

  return withoutFence.slice(start, end + 1);
}

function parseJsonFromCompletion(content: string) {
  try {
    return JSON.parse(extractJsonObject(content)) as unknown;
  } catch (error) {
    if (error instanceof LocalAiError) {
      throw error;
    }
    throw new LocalAiError('本地 AI 返回的 JSON 无法解析');
  }
}

async function fetchLocalAiDraft({
  prompt,
  currentDocument,
  config,
  fetchImpl = fetch,
  signal
}: {
  prompt: string;
  currentDocument: SurveyDocument;
  config: LocalAiConfig;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}) {
  const controller = new AbortController();
  const abortUpstream = () => controller.abort();
  if (signal?.aborted) {
    controller.abort();
  } else {
    signal?.addEventListener('abort', abortUpstream, { once: true });
  }
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);

  try {
    const response = await fetchImpl(`${config.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        stream: false,
        temperature: 0.2,
        messages: [
          { role: 'system', content: buildSystemPrompt() },
          { role: 'user', content: buildUserPrompt(prompt, currentDocument) }
        ]
      }),
      signal: controller.signal
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      throw new LocalAiError(`本地 AI 服务返回 ${response.status}${detail ? `：${detail.slice(0, 200)}` : ''}`);
    }

    const completion = openAiChatCompletionSchema.safeParse(await response.json());
    if (!completion.success) {
      throw new LocalAiError('本地 AI 响应不是 OpenAI-compatible chat/completions 格式');
    }

    const content = normalizeCompletionContent(completion.data.choices[0]?.message?.content);
    if (!content.trim()) {
      throw new LocalAiError('本地 AI 返回内容为空');
    }

    const parsed = parseJsonFromCompletion(content);
    const draft = aiSurveyDraftSchema.safeParse(parsed);
    if (!draft.success) {
      throw new LocalAiError('本地 AI JSON 不符合问卷草稿结构');
    }

    return draft.data;
  } catch (error) {
    if (error instanceof LocalAiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new LocalAiError(signal?.aborted ? '本地 AI 请求已中断' : '本地 AI 请求超时');
    }

    throw new LocalAiError(error instanceof Error ? error.message : '本地 AI 调用失败');
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abortUpstream);
  }
}

function normalizeLevel(value: BlockDraft['level']) {
  if (value === 1 || value === 2 || value === 3) {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.toLowerCase().replace(/^h/, '');
    if (normalized === '1' || normalized === '2' || normalized === '3') {
      return Number(normalized) as 1 | 2 | 3;
    }
  }

  return 1;
}

function pickStableBlockId(draft: BlockDraft, currentIds: Set<string>, usedIds: Set<string>) {
  const candidate = draft.existingId ?? draft.id;
  if (candidate && currentIds.has(candidate) && !usedIds.has(candidate)) {
    usedIds.add(candidate);
    return candidate;
  }

  if (candidate && !usedIds.has(candidate) && /^block-[\w-]+$/.test(candidate)) {
    usedIds.add(candidate);
    return candidate;
  }

  const id = createId('block');
  usedIds.add(id);
  return id;
}

function normalizeOptions(
  draftOptions: BlockDraft['options'],
  fallbackOptions?: ChoiceOption[]
): ChoiceOption[] {
  const usedIds = new Set<string>();
  const normalized = (draftOptions ?? [])
    .map((option) => {
      if (typeof option === 'string') {
        return { id: createId('option'), text: option.trim() };
      }

      const text = nonEmptyString(option.text ?? option.label, '选项');
      const candidateId = option.id;
      const id = candidateId && !usedIds.has(candidateId) ? candidateId : createId('option');
      usedIds.add(id);
      return { id, text };
    })
    .filter((option) => option.text);

  if (normalized.length > 0) {
    return normalized;
  }

  if (fallbackOptions?.length) {
    return fallbackOptions.map((option) => ({ ...option }));
  }

  return [
    { id: createId('option'), text: '选项 1' },
    { id: createId('option'), text: '选项 2' }
  ];
}

function normalizeBlock(draft: BlockDraft, currentBlocksById: Map<string, SurveyBlock>, usedIds: Set<string>) {
  const currentIds = new Set(currentBlocksById.keys());
  const id = pickStableBlockId(draft, currentIds, usedIds);
  const previousBlock = currentBlocksById.get(id);
  const align = draft.align ?? (previousBlock && 'align' in previousBlock ? previousBlock.align : undefined);

  switch (draft.type) {
    case 'title':
      return {
        id,
        type: 'title' as const,
        label: nonEmptyString(draft.label ?? draft.content, previousBlock?.type === 'title' ? previousBlock.label : '新标题'),
        level: normalizeLevel(draft.level ?? (previousBlock?.type === 'title' ? previousBlock.level : undefined)),
        ...(align ? { align } : {})
      };
    case 'paragraph':
      return {
        id,
        type: 'paragraph' as const,
        content: nonEmptyString(draft.content ?? draft.label, previousBlock?.type === 'paragraph' ? previousBlock.content : '这是一段说明文字'),
        ...(align ? { align } : {})
      };
    case 'input':
      return {
        id,
        type: 'input' as const,
        label: nonEmptyString(draft.label, previousBlock?.type === 'input' ? previousBlock.label : '填写题'),
        ...(optionalNonEmptyString(draft.description) ? { description: optionalNonEmptyString(draft.description) } : previousBlock?.type === 'input' && previousBlock.description ? { description: previousBlock.description } : {}),
        ...(typeof draft.required === 'boolean' ? { required: draft.required } : previousBlock?.type === 'input' && typeof previousBlock.required === 'boolean' ? { required: previousBlock.required } : {}),
        ...(optionalNonEmptyString(draft.placeholder) ? { placeholder: optionalNonEmptyString(draft.placeholder) } : previousBlock?.type === 'input' && previousBlock.placeholder ? { placeholder: previousBlock.placeholder } : {})
      };
    case 'singleChoice':
    case 'multiChoice': {
      const previousChoiceBlock = previousBlock?.type === 'singleChoice' || previousBlock?.type === 'multiChoice' ? previousBlock : undefined;
      const choiceBlock = {
        id,
        type: draft.type,
        label: nonEmptyString(draft.label, previousChoiceBlock?.label ?? (draft.type === 'singleChoice' ? '单选题' : '多选题')),
        ...(optionalNonEmptyString(draft.description) ? { description: optionalNonEmptyString(draft.description) } : previousChoiceBlock?.description ? { description: previousChoiceBlock.description } : {}),
        ...(typeof draft.required === 'boolean' ? { required: draft.required } : typeof previousChoiceBlock?.required === 'boolean' ? { required: previousChoiceBlock.required } : {}),
        options: normalizeOptions(draft.options, previousChoiceBlock?.options)
      };

      return choiceBlock as SingleChoiceBlock | MultiChoiceBlock;
    }
    default:
      throw new LocalAiError(`不支持的题目类型：${draft.type satisfies never}`);
  }
}

function normalizeDraftDocument(draft: AiSurveyDraft, currentDocument: SurveyDocument) {
  const currentBlocksById = new Map(currentDocument.blocks.map((block) => [block.id, block]));
  const usedIds = new Set<string>();
  const draftTitle = optionalNonEmptyString(draft.title);
  const draftBlocks = currentDocument.blocks.length === 0 && draftTitle && !draft.blocks.some((block) => block.type === 'title')
    ? [{ type: 'title' as const, label: draftTitle, level: 1 as const }, ...draft.blocks]
    : draft.blocks;
  const blocks = draftBlocks.map((blockDraft) => normalizeBlock(blockDraft, currentBlocksById, usedIds));
  const now = new Date().toISOString();

  const parsedDocument = surveyDocumentSchema.safeParse({
    ...currentDocument,
    title: nonEmptyString(draft.title, currentDocument.title),
    ...(optionalNonEmptyString(draft.description) ? { description: optionalNonEmptyString(draft.description) } : currentDocument.description ? { description: currentDocument.description } : {}),
    blocks,
    settings: {
      ...currentDocument.settings,
      submitLabel: nonEmptyString(draft.submitLabel, currentDocument.settings.submitLabel)
    },
    meta: {
      ...currentDocument.meta,
      version: currentDocument.meta.version + 1,
      updatedAt: now
    }
  });

  if (!parsedDocument.success) {
    throw new LocalAiError('本地 AI 草稿无法转换为有效问卷文档');
  }

  return parsedDocument.data;
}

function valuesEqual(left: unknown, right: unknown) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function buildChangedFields(currentBlock: SurveyBlock, nextBlock: SurveyBlock) {
  const changes: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(nextBlock)) {
    if (key === 'id' || key === 'type') {
      continue;
    }

    if (!valuesEqual((currentBlock as unknown as Record<string, unknown>)[key], value)) {
      changes[key] = value;
    }
  }

  return changes;
}

function buildOperations(currentDocument: SurveyDocument, nextDocument: SurveyDocument): ChangeOperation[] {
  const operations: ChangeOperation[] = [];
  const currentBlocksById = new Map(currentDocument.blocks.map((block) => [block.id, block]));
  const nextBlocksById = new Map(nextDocument.blocks.map((block) => [block.id, block]));

  for (const block of currentDocument.blocks) {
    if (!nextBlocksById.has(block.id)) {
      operations.push({ type: 'removeBlock', blockId: block.id });
    }
  }

  for (const [index, block] of nextDocument.blocks.entries()) {
    const currentBlock = currentBlocksById.get(block.id);
    if (!currentBlock) {
      operations.push({
        type: 'addBlock',
        block,
        ...(index > 0 ? { afterBlockId: nextDocument.blocks[index - 1]?.id } : {})
      });
      continue;
    }

    const changes = buildChangedFields(currentBlock, block);
    if (Object.keys(changes).length > 0) {
      operations.push({ type: 'updateBlock', blockId: block.id, changes });
    }
  }

  const currentCommonIds = currentDocument.blocks.filter((block) => nextBlocksById.has(block.id)).map((block) => block.id);
  const nextCommonIds = nextDocument.blocks.filter((block) => currentBlocksById.has(block.id)).map((block) => block.id);

  nextCommonIds.forEach((blockId, index) => {
    if (currentCommonIds[index] !== blockId) {
      const nextIndex = nextDocument.blocks.findIndex((block) => block.id === blockId);
      operations.push({
        type: 'moveBlock',
        blockId,
        ...(nextIndex > 0 ? { targetBlockId: nextDocument.blocks[nextIndex - 1]?.id } : {})
      });
    }
  });

  return operations;
}

function buildSummary(draft: AiSurveyDraft, operations: ChangeOperation[]) {
  const summary = optionalNonEmptyString(draft.summary);
  if (summary) {
    return summary;
  }

  const counts = operations.reduce(
    (acc, operation) => {
      acc[operation.type] += 1;
      return acc;
    },
    { addBlock: 0, removeBlock: 0, moveBlock: 0, updateBlock: 0 } satisfies Record<ChangeOperation['type'], number>
  );

  const segments = [
    counts.addBlock ? `新增 ${counts.addBlock} 个题目` : '',
    counts.updateBlock ? `修改 ${counts.updateBlock} 个题目` : '',
    counts.moveBlock ? `调整 ${counts.moveBlock} 个题目顺序` : '',
    counts.removeBlock ? `删除 ${counts.removeBlock} 个题目` : ''
  ].filter(Boolean);

  return segments.length ? segments.join('，') : 'AI 生成修改建议';
}

function buildChangeSetFromDraft(prompt: string, currentDocument: SurveyDocument, draft: AiSurveyDraft): AiDraftChangeSet {
  const nextDocument = normalizeDraftDocument(draft, currentDocument);
  const operations = buildOperations(currentDocument, nextDocument);

  if (operations.length === 0) {
    throw new LocalAiError('本地 AI 没有生成任何可预览的问卷修改');
  }

  const parsedChangeSet = aiDraftChangeSetSchema.safeParse({
    id: createId('change'),
    basedOnVersion: currentDocument.meta.version,
    userIntent: prompt,
    summary: buildSummary(draft, operations),
    operations,
    nextDocument
  });

  if (!parsedChangeSet.success) {
    throw new LocalAiError('本地 AI 草稿无法转换为有效修改预览');
  }

  return parsedChangeSet.data;
}

export async function buildLocalAiChangeSet({
  prompt,
  currentDocument,
  env = process.env,
  fetchImpl = fetch,
  signal
}: {
  prompt: string;
  currentDocument: SurveyDocument;
  env?: NodeJS.ProcessEnv;
  fetchImpl?: typeof fetch;
  signal?: AbortSignal;
}) {
  const config = getLocalAiConfig(env);
  if (!config) {
    return null;
  }

  const requestId = createAiRequestId();
  const startedAt = Date.now();
  logAiDebug(config, {
    event: 'request',
    requestId,
    model: config.model,
    baseUrl: config.baseUrl,
    promptLength: prompt.length,
    documentId: currentDocument.id,
    documentVersion: currentDocument.meta.version,
    blockCount: currentDocument.blocks.length
  });

  try {
    const draft = await fetchLocalAiDraft({ prompt, currentDocument, config, fetchImpl, signal });
    const changeSet = buildChangeSetFromDraft(prompt, currentDocument, draft);
    logAiDebug(config, {
      event: 'success',
      requestId,
      model: config.model,
      durationMs: Date.now() - startedAt,
      operationCount: changeSet.operations.length,
      nextBlockCount: changeSet.nextDocument.blocks.length
    });
    return changeSet;
  } catch (error) {
    logAiDebug(config, {
      event: 'failure',
      requestId,
      model: config.model,
      durationMs: Date.now() - startedAt,
      error: error instanceof Error ? error.message : 'unknown error'
    });
    throw error;
  }
}
