import { aiDraftChangeSetSchema, type AiDraftChangeSet } from '@/features/ai-assistant/types';
import { buildLocalAiChangeSet, LocalAiError } from '@/features/ai-assistant/local-ai';
import { getAiModelCandidates, type AiModelCandidate } from '@/features/ai-assistant/model-config';
import { buildMockChangeSet } from '@/features/ai-assistant/mock-change-set';
import { getDemoRequestContext, jsonWithDemoContext } from '@/features/demo-mode/http';
import { assertAiQuota, DemoQuotaExceededError, recordAiUsage } from '@/features/demo-mode/quota';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

const BUILTIN_NO_MODEL_NOTICE = '当前未配置 AI 模型，这是内置生成器生成的。';
const BUILTIN_QUOTA_NOTICE = 'AI 使用超过了演示站限制，这是内置生成器生成的。';
const GENERIC_AI_ERROR_MESSAGE = 'AI 暂时没能生成修改建议，请稍后重试或换个说法。';
const AUTO_TIMEOUT_ERROR_MESSAGE = 'auto 模式连续切换模型仍超时，请稍后重试或选择具体模型。';
const SINGLE_TIMEOUT_ERROR_MESSAGE = '当前模型响应超时，可以切换到 auto 模式或稍后重试。';
const AUTO_MODEL_TIMEOUT_MS = 30_000;
const SINGLE_MODEL_TIMEOUT_MS = 60_000;
const AUTO_MAX_MODEL_SWITCHES = 3;

class AiRouteError extends Error {
  constructor(public status: number, public userMessage: string) {
    super(userMessage);
    this.name = 'AiRouteError';
  }
}

function buildFallbackChangeSet(prompt: string, currentDocument: SurveyDocument, notice: string): AiDraftChangeSet {
  return {
    ...buildMockChangeSet(prompt, currentDocument),
    source: 'builtin',
    notice
  };
}

function parseModelSelection(body: unknown) {
  if (!body || typeof body !== 'object' || !('modelSelection' in body)) {
    return 'auto';
  }

  const value = (body as { modelSelection?: unknown }).modelSelection;
  return typeof value === 'string' && value.trim() ? value.trim() : 'auto';
}

function attachAiMetadata(changeSet: AiDraftChangeSet, candidate: AiModelCandidate, timedOutModels: string[] = []): AiDraftChangeSet {
  return {
    ...changeSet,
    source: 'ai',
    modelAlias: candidate.alias,
    ...(timedOutModels.length > 0 ? { timedOutModels } : {})
  };
}

async function callCandidate({
  prompt,
  currentDocument,
  candidate,
  timeoutMs,
  signal
}: {
  prompt: string;
  currentDocument: SurveyDocument;
  candidate: AiModelCandidate;
  timeoutMs: number;
  signal: AbortSignal;
}) {
  const changeSet = await buildLocalAiChangeSet({ prompt, currentDocument, candidate, timeoutMs, signal });
  if (!changeSet) {
    throw new AiRouteError(502, GENERIC_AI_ERROR_MESSAGE);
  }

  return changeSet;
}

async function buildExplicitModelChangeSet({
  prompt,
  currentDocument,
  candidate,
  signal
}: {
  prompt: string;
  currentDocument: SurveyDocument;
  candidate: AiModelCandidate;
  signal: AbortSignal;
}) {
  try {
    const changeSet = await callCandidate({
      prompt,
      currentDocument,
      candidate,
      timeoutMs: candidate.singleTimeoutMs ?? SINGLE_MODEL_TIMEOUT_MS,
      signal
    });
    return attachAiMetadata(changeSet, candidate);
  } catch (error) {
    if (error instanceof LocalAiError && error.code === 'timeout') {
      throw new AiRouteError(504, SINGLE_TIMEOUT_ERROR_MESSAGE);
    }

    if (error instanceof LocalAiError && error.code === 'aborted') {
      throw new AiRouteError(499, 'AI 生成已中断。');
    }

    if (error instanceof LocalAiError) {
      throw new AiRouteError(502, GENERIC_AI_ERROR_MESSAGE);
    }

    throw error;
  }
}

async function buildAutoModelChangeSet({
  prompt,
  currentDocument,
  candidates,
  signal
}: {
  prompt: string;
  currentDocument: SurveyDocument;
  candidates: AiModelCandidate[];
  signal: AbortSignal;
}) {
  const timedOutModels: string[] = [];
  const attempts = candidates.slice(0, AUTO_MAX_MODEL_SWITCHES + 1);
  let hasNonTimeoutFailure = false;

  for (const candidate of attempts) {
    try {
      const changeSet = await callCandidate({
        prompt,
        currentDocument,
        candidate,
        timeoutMs: candidate.autoTimeoutMs ?? AUTO_MODEL_TIMEOUT_MS,
        signal
      });
      return attachAiMetadata(changeSet, candidate, timedOutModels);
    } catch (error) {
      if (error instanceof LocalAiError && error.code === 'timeout') {
        timedOutModels.push(candidate.alias);
        continue;
      }

      if (error instanceof LocalAiError && error.code === 'aborted') {
        throw new AiRouteError(499, 'AI 生成已中断。');
      }

      if (error instanceof LocalAiError) {
        hasNonTimeoutFailure = true;
        continue;
      }

      throw error;
    }
  }

  throw new AiRouteError(
    hasNonTimeoutFailure ? 502 : 504,
    hasNonTimeoutFailure ? GENERIC_AI_ERROR_MESSAGE : AUTO_TIMEOUT_ERROR_MESSAGE
  );
}

async function buildAiChangeSet({
  prompt,
  currentDocument,
  modelSelection,
  signal
}: {
  prompt: string;
  currentDocument: SurveyDocument;
  modelSelection: string;
  signal: AbortSignal;
}) {
  const candidates = getAiModelCandidates();

  if (candidates.length === 0) {
    return buildFallbackChangeSet(prompt, currentDocument, BUILTIN_NO_MODEL_NOTICE);
  }

  const shouldUseAuto = candidates.length >= 2 && modelSelection === 'auto';
  if (shouldUseAuto) {
    return buildAutoModelChangeSet({ prompt, currentDocument, candidates, signal });
  }

  const candidate = modelSelection === 'auto'
    ? candidates[0]
    : candidates.find((item) => item.id === modelSelection);

  if (!candidate) {
    throw new AiRouteError(400, '请选择一个可用的 AI 模型。');
  }

  return buildExplicitModelChangeSet({ prompt, currentDocument, candidate, signal });
}

export async function POST(request: Request) {
  const demoContext = await getDemoRequestContext(request);
  const body = await request.json();
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const currentDocument: SurveyDocument = surveyDocumentSchema.parse(body.currentDocument);
  const modelSelection = parseModelSelection(body);

  try {
    if (getAiModelCandidates().length === 0) {
      const changeSet = buildFallbackChangeSet(prompt, currentDocument, BUILTIN_NO_MODEL_NOTICE);
      return jsonWithDemoContext(aiDraftChangeSetSchema.parse(changeSet), undefined, demoContext);
    }

    try {
      if (demoContext) {
        await assertAiQuota({ store: demoContext.store, ipHash: demoContext.ipHash });
      }
    } catch (error) {
      if (error instanceof DemoQuotaExceededError && error.code === 'AI_DAILY_LIMIT') {
        const changeSet = buildFallbackChangeSet(prompt, currentDocument, BUILTIN_QUOTA_NOTICE);
        return jsonWithDemoContext(aiDraftChangeSetSchema.parse(changeSet), undefined, demoContext);
      }

      throw error;
    }

    const changeSet = await buildAiChangeSet({ prompt, currentDocument, modelSelection, signal: request.signal });

    if (changeSet.source !== 'builtin' && demoContext) {
      await recordAiUsage({
        store: demoContext.store,
        visitorId: demoContext.visitorId,
        ipHash: demoContext.ipHash
      });
    }

    return jsonWithDemoContext(aiDraftChangeSetSchema.parse(changeSet), undefined, demoContext);
  } catch (error) {
    if (error instanceof AiRouteError) {
      return jsonWithDemoContext({ error: error.userMessage }, { status: error.status }, demoContext);
    }

    if (error instanceof DemoQuotaExceededError) {
      return jsonWithDemoContext({ error: error.userMessage, code: error.code }, { status: error.status }, demoContext);
    }

    if (error instanceof LocalAiError) {
      return jsonWithDemoContext(
        { error: error.code === 'timeout' ? SINGLE_TIMEOUT_ERROR_MESSAGE : GENERIC_AI_ERROR_MESSAGE },
        { status: error.code === 'timeout' ? 504 : 502 },
        demoContext
      );
    }

    throw error;
  }
}
