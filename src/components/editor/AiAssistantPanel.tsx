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

function isAbortError(error: unknown) {
  return error instanceof DOMException && error.name === 'AbortError';
}

export function AiAssistantPanel({
  readOnly = false,
  isGenerating = false,
  onGenerationStateChange
}: {
  readOnly?: boolean;
  isGenerating?: boolean;
  onGenerationStateChange?: (isGenerating: boolean) => void;
}) {
  const survey = useEditorStore((state) => state.survey);
  const pendingChangeSet = useEditorStore((state) => state.pendingChangeSet);
  const setPendingChangeSet = useEditorStore((state) => state.setPendingChangeSet);
  const discardPendingChangeSet = useEditorStore((state) => state.discardPendingChangeSet);
  const applyPendingChangeSet = useEditorStore((state) => state.applyPendingChangeSet);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const interactionDisabled = readOnly || isLoading || isGenerating;

  useEffect(() => {
    return () => {
      abortControllerRef.current?.abort();
    };
  }, []);

  async function requestChanges(nextPrompt = prompt) {
    if (readOnly || isLoading || isGenerating) {
      return;
    }

    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setIsLoading(true);
    onGenerationStateChange?.(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: nextPrompt, currentDocument: survey }),
        signal: abortController.signal
      });

      if (!response.ok) {
        throw new Error('AI change request failed');
      }

      const payload = aiDraftChangeSetSchema.parse(await response.json());
      setPendingChangeSet(payload);
    } catch (requestError) {
      setError(isAbortError(requestError) ? AI_GENERATION_ABORTED_MESSAGE : AI_GENERATION_ERROR_MESSAGE);
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
          <p className="m-0 text-xs leading-5 text-[#667085]">先点一个示例把 prompt 填进去，再直接让 AI 生成建议。</p>
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
        <div className="mt-3">
          <button
            className="ui-btn ui-btn-primary"
            disabled={!prompt.trim() || interactionDisabled}
            onClick={() => requestChanges()}
            type="button"
          >
            直接生成建议
          </button>
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
            <p className="m-0 text-xs leading-5 text-[#475569]">这一步不会直接修改问卷，生成后会先给你预览。</p>
            <p className="m-0 text-xs leading-5 text-[#64748b]">如果觉得等太久，可以中断后换个说法再试。</p>
          </div>
          <button className="ui-btn ui-btn-secondary w-full" onClick={cancelGeneration} type="button">
            中断生成
          </button>
        </div>
      ) : null}

      {error ? <p className="m-0 text-sm text-[#b42318]">{error}</p> : null}
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
