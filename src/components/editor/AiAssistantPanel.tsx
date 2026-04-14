'use client';

import { useState } from 'react';
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

export function AiAssistantPanel({ readOnly = false }: { readOnly?: boolean }) {
  const survey = useEditorStore((state) => state.survey);
  const pendingChangeSet = useEditorStore((state) => state.pendingChangeSet);
  const setPendingChangeSet = useEditorStore((state) => state.setPendingChangeSet);
  const discardPendingChangeSet = useEditorStore((state) => state.discardPendingChangeSet);
  const applyPendingChangeSet = useEditorStore((state) => state.applyPendingChangeSet);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestChanges(nextPrompt = prompt) {
    if (readOnly) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt: nextPrompt, currentDocument: survey })
      });

      if (!response.ok) {
        throw new Error('AI change request failed');
      }

      const payload = aiDraftChangeSetSchema.parse(await response.json());
      setPendingChangeSet(payload);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : '未知错误');
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="space-y-2">
        <h3 className="ui-section-title text-[18px]">AI 助手</h3>
        <p className="m-0 text-sm leading-6 text-[#667085]">直接描述你想生成或修改的问卷内容，先看变更预览，再决定是否应用。</p>
      </div>

      {readOnly ? (
        <div className="ui-panel-soft border-[#fed7aa] bg-[#fff7ed] p-4 text-sm leading-6 text-[#9a3412]">
          当前问卷已经收集到答卷，AI 改卷能力暂时关闭，避免直接覆盖已在收集中的版本。
        </div>
      ) : null}

      <div className="ui-panel-soft p-4">
        <div className="space-y-1">
          <strong className="text-[15px] leading-6 text-[#101828]">快速开始</strong>
          <p className="m-0 text-xs leading-5 text-[#667085]">先点一个示例把 prompt 填进去，再直接让 AI 生成建议。</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {QUICK_PROMPTS.map((item) => (
            <button
              className="ui-btn ui-btn-secondary"
              disabled={readOnly}
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
            disabled={!prompt.trim() || isLoading || readOnly}
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
          disabled={readOnly}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="例如：生成一个用户满意度问卷，先给我一个标题、姓名填写、满意度单选和改进方向多选。"
          rows={8}
          value={prompt}
        />
      </label>

      <button
        className="ui-btn ui-btn-primary w-full"
        disabled={!prompt.trim() || isLoading || readOnly}
        onClick={() => requestChanges()}
        type="button"
      >
        {isLoading ? '生成中...' : '生成修改建议'}
      </button>

      {error ? <p className="m-0 text-sm text-[#b42318]">{error}</p> : null}
      {pendingChangeSet ? (
        <AiChangePreview
          changeSet={pendingChangeSet}
          currentDocument={survey}
          onApply={applyPendingChangeSet}
          onDiscard={discardPendingChangeSet}
        />
      ) : null}
    </section>
  );
}
