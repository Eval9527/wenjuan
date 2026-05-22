'use client';

import { useEffect, useRef, useState } from 'react';
import { aiDraftChangeSetSchema } from '@/features/ai-assistant/types';
import { AiChangePreview } from './AiChangePreview';
import { useEditorStore } from './editor-store-context';

const QUICK_PROMPTS = [
  {
    label: '活动报名',
    prompt: '生成一个活动报名问卷，包含标题、姓名填写、单选参与场次'
  },
  {
    label: '满意度回访',
    prompt: '生成一个满意度回访问卷，包含标题、单选满意度、多选改进方向'
  },
  {
    label: '线索收集',
    prompt: '生成一个销售线索收集问卷，包含标题、姓名填写、单选需求类型'
  }
] as const;

function GlobalSurveySettings({ readOnly = false }: { readOnly?: boolean }) {
  const surveyTitle = useEditorStore((state) => state.survey.title);
  const updateSurveyTitle = useEditorStore((state) => state.updateSurveyTitle);
  const [draftTitle, setDraftTitle] = useState(surveyTitle);
  const [isComposingTitle, setIsComposingTitle] = useState(false);

  useEffect(() => {
    if (!isComposingTitle) {
      setDraftTitle(surveyTitle);
    }
  }, [isComposingTitle, surveyTitle]);

  function commitTitle(nextTitle: string) {
    const normalizedTitle = nextTitle.trim();

    if (!readOnly && normalizedTitle && normalizedTitle !== surveyTitle) {
      updateSurveyTitle(normalizedTitle);
    }
  }

  return (
    <div className="ai-global-settings ui-panel-soft p-4">
      <div className="space-y-1">
        <strong className="text-[15px] leading-6 text-[#101828]">问卷设置</strong>
        <p className="m-0 text-xs leading-5 text-[#667085]">
          这里设置整份问卷标题，不会同步修改画布里的标题组件。
        </p>
      </div>
      <label className="ui-field mt-3">
        <span className="ui-field-label">全局问卷标题</span>
        <input
          aria-label="全局问卷标题"
          className="ui-input"
          disabled={readOnly}
          onBlur={(event) => commitTitle(event.target.value)}
          onChange={(event) => {
            setDraftTitle(event.target.value);
            if (!isComposingTitle) {
              commitTitle(event.target.value);
            }
          }}
          onCompositionEnd={(event) => {
            setIsComposingTitle(false);
            setDraftTitle(event.currentTarget.value);
            commitTitle(event.currentTarget.value);
          }}
          onCompositionStart={() => setIsComposingTitle(true)}
          placeholder="输入问卷标题"
          type="text"
          value={draftTitle}
        />
      </label>
    </div>
  );
}

const AI_GENERATION_ERROR_MESSAGE = 'AI 暂时没能生成修改建议，请稍后重试或换个说法。';
const AI_GENERATION_ABORTED_MESSAGE = '已中断生成，当前问卷没有变化。';

type AiModelOption = {
  id: string;
  alias: string;
  providerAlias: string;
  primary: boolean;
};

type AiModelOptionsResponse = {
  mode: 'configured' | 'builtin-only';
  defaultSelection: string;
  showSelector: boolean;
  models: AiModelOption[];
};

class AiRequestError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AiRequestError';
  }
}

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

function isAiModelOptionsResponse(value: unknown): value is AiModelOptionsResponse {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const payload = value as Partial<AiModelOptionsResponse>;
  return (payload.mode === 'configured' || payload.mode === 'builtin-only') &&
    typeof payload.defaultSelection === 'string' &&
    typeof payload.showSelector === 'boolean' &&
    Array.isArray(payload.models);
}

function isSafeUserFacingAiError(message: string) {
  return !/(本地\s*AI|openai-compatible|localhost|127\.0\.0\.1|https?:\/\/|api[_ -]?key|stack|trace)/i.test(message);
}

async function readAiErrorMessage(response: Response) {
  try {
    const payload = await response.json();
    const message = typeof payload?.error === 'string' ? payload.error.trim() : '';
    if (message && isSafeUserFacingAiError(message)) {
      return message;
    }
  } catch {
    // Keep the generic message below.
  }

  return AI_GENERATION_ERROR_MESSAGE;
}

function clearEditorUrlParams(paramNames: string[]) {
  if (typeof window === 'undefined' || !paramNames.length) {
    return;
  }

  const url = new URL(window.location.href);
  let changed = false;

  for (const paramName of paramNames) {
    if (url.searchParams.has(paramName)) {
      url.searchParams.delete(paramName);
      changed = true;
    }
  }

  if (changed) {
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}${url.hash}`);
  }
}

export function AiAssistantPanel({
  initialPrompt,
  readOnly = false,
  isGenerating = false,
  onGenerationStateChange
}: {
  initialPrompt?: string;
  readOnly?: boolean;
  isGenerating?: boolean;
  onGenerationStateChange?: (isGenerating: boolean) => void;
}) {
  const survey = useEditorStore((state) => state.survey);
  const pendingChangeSet = useEditorStore((state) => state.pendingChangeSet);
  const setPendingChangeSet = useEditorStore((state) => state.setPendingChangeSet);
  const discardPendingChangeSet = useEditorStore((state) => state.discardPendingChangeSet);
  const applyPendingChangeSet = useEditorStore((state) => state.applyPendingChangeSet);
  const applyChangeSet = useEditorStore((state) => state.applyChangeSet);
  const normalizedInitialPrompt = initialPrompt?.trim() ?? '';
  const [prompt, setPrompt] = useState(normalizedInitialPrompt);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [modelOptions, setModelOptions] = useState<AiModelOptionsResponse | null>(null);
  const [modelSelection, setModelSelection] = useState('auto');
  const abortControllerRef = useRef<AbortController | null>(null);
  const hasAutoRequestedRef = useRef(false);
  const interactionDisabled = readOnly || isLoading || isGenerating;
  const showModelSelector = Boolean(modelOptions?.showSelector && modelOptions.models.length >= 2);

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    let mounted = true;

    async function loadModelOptions() {
      try {
        const response = await fetch('/api/ai/models');
        if (!response.ok) {
          return;
        }

        const payload = await response.json();
        if (!mounted || !isAiModelOptionsResponse(payload)) {
          return;
        }

        setModelOptions(payload);
        setModelSelection(payload.defaultSelection || 'auto');
      } catch {
        // The selector is progressive enhancement; generation can still proceed.
      }
    }

    void loadModelOptions();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    const nextPrompt = initialPrompt?.trim();

    if (!nextPrompt || readOnly || hasAutoRequestedRef.current) {
      return;
    }

    const timer = window.setTimeout(() => {
      if (hasAutoRequestedRef.current) {
        return;
      }

      hasAutoRequestedRef.current = true;
      setPrompt(nextPrompt);
      void requestChanges(nextPrompt, { clearAiPromptFromUrl: true });
    }, 0);

    return () => {
      window.clearTimeout(timer);
    };
  }, [initialPrompt, readOnly]);

  async function requestChanges(
    nextPrompt = prompt,
    options: {
      clearAiPromptFromUrl?: boolean;
    } = {}
  ) {
    if (readOnly || isLoading || isGenerating) {
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);
    onGenerationStateChange?.(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch('/api/ai/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: nextPrompt, currentDocument: survey, modelSelection }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new AiRequestError(await readAiErrorMessage(response));
      }

      const payload = aiDraftChangeSetSchema.parse(await response.json());
      setNotice(payload.notice ?? null);
      if (survey.blocks.length === 0) {
        applyChangeSet(payload);
      } else {
        setPendingChangeSet(payload);
      }

      if (options.clearAiPromptFromUrl) {
        clearEditorUrlParams(['aiPrompt']);
      }
    } catch (requestError) {
      setError(
        isAbortError(requestError)
          ? AI_GENERATION_ABORTED_MESSAGE
          : requestError instanceof AiRequestError
            ? requestError.message
            : AI_GENERATION_ERROR_MESSAGE
      );
    } finally {
      if (abortControllerRef.current === abortController) {
        abortControllerRef.current = null;
      }
      setIsLoading(false);
      onGenerationStateChange?.(false);
    }
  }

  function cancelGeneration() {
    abortControllerRef.current?.abort();
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="space-y-2">
        <h3 className="ui-section-title text-[18px] flex items-center gap-2">
          <span aria-hidden="true" className="ai-title-icon">
            AI
          </span>
          <span>AI 助手</span>
        </h3>
        <p className="m-0 text-sm leading-6 text-[#667085]">直接描述你想生成或修改的问卷内容，先看变更预览，再决定是否应用。</p>
      </div>

      {readOnly ? (
        <div className="ui-panel-soft border-[#fed7aa] bg-[#fff7ed] p-4 text-sm leading-6 text-[#9a3412]">
          当前问卷已经收集到答卷，AI 改卷能力暂时关闭，避免直接覆盖已在收集中的版本。
        </div>
      ) : null}

      <GlobalSurveySettings readOnly={readOnly || isLoading || isGenerating} />

      <div className="ui-panel-soft p-4">
        <div className="space-y-1">
          <strong className="text-[15px] leading-6 text-[#101828]">快速开始</strong>
          <p className="m-0 text-xs leading-5 text-[#667085]">点一个示例填入指令，再用下方按钮生成修改建议。</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((item) => (
            <button
              className="ui-btn ui-btn-secondary"
              disabled={interactionDisabled}
              key={item.label}
              onClick={() => setPrompt(item.prompt)}
              type="button"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>


      <label className="ui-field">
        <span className="ui-field-label">AI 指令</span>
        <textarea
          aria-label="AI prompt"
          className="ui-textarea"
          disabled={interactionDisabled}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="例如：生成一个用户满意度问卷，先给我一个标题、姓名填写、满意度单选和改进方向多选。"
          rows={8}
          value={prompt}
        />
      </label>

      {showModelSelector ? (
        <label className="ui-field ai-model-selector">
          <span className="ui-field-label">AI 模型</span>
          <select
            aria-label="AI 模型"
            className="ui-select"
            disabled={interactionDisabled}
            onChange={(event) => setModelSelection(event.target.value)}
            value={modelSelection}
          >
            <option value="auto">auto 模式</option>
            {modelOptions?.models.map((model) => (
              <option key={model.id} value={model.id}>
                {model.alias} · {model.providerAlias}
              </option>
            ))}
          </select>
          <span className="text-xs leading-5 text-[#667085]">
            auto 模式会优先使用主模型，超时后自动切换备用模型。
          </span>
        </label>
      ) : null}

      <button
        aria-label={isLoading ? '生成中' : '生成修改建议'}
        className={[
          'ui-btn ui-btn-primary w-full ai-generate-button',
          isLoading ? 'ai-generate-button--loading' : ''
        ].join(' ')}
        disabled={!prompt.trim() || interactionDisabled}
        onClick={() => requestChanges()}
        type="button"
      >
        <span className="flex items-center justify-center gap-2">
          <span aria-hidden="true" className="ai-button-spark">✦</span>
          {isLoading ? '生成中...' : '生成修改建议'}
        </span>
      </button>

      {isLoading || isGenerating ? (
        <div className="ai-generation-hint" role="status">
          <div className="space-y-1">
            <p className="m-0 text-xs leading-5 text-[#475569]">
              {survey.blocks.length === 0
                ? '当前问卷为空，生成完成后会直接放到画布里。'
                : '这一步不会直接修改问卷，生成后会先给你预览。'}
            </p>
            <p className="m-0 text-xs leading-5 text-[#64748b]">如果觉得等太久，可以中断后换个说法再试。</p>
          </div>
          <button className="ui-btn ui-btn-secondary w-full" onClick={cancelGeneration} type="button">
            中断生成
          </button>
        </div>
      ) : null}

      {error ? <p className="m-0 text-sm text-[#b42318]">{error}</p> : null}
      {notice ? (
        <div className="ui-panel-soft border-[#bfdbfe] bg-[#eff6ff] p-3 text-sm leading-6 text-[#1d4ed8]">
          {notice}
        </div>
      ) : null}
      {pendingChangeSet ? (
        <div
          aria-labelledby="ai-change-preview-title"
          aria-modal="true"
          className="editor-ai-modal-backdrop"
          role="dialog"
        >
          <div className="editor-ai-modal">
            <AiChangePreview
              changeSet={pendingChangeSet}
              currentDocument={survey}
              onApply={applyPendingChangeSet}
              onDiscard={discardPendingChangeSet}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}
