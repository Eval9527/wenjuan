'use client';

import { useState } from 'react';
import { aiDraftChangeSetSchema } from '@/features/ai-assistant/types';
import { AiChangePreview } from './AiChangePreview';
import { useEditorStore } from './editor-store-context';

export function AiAssistantPanel() {
  const survey = useEditorStore((state) => state.survey);
  const pendingChangeSet = useEditorStore((state) => state.pendingChangeSet);
  const setPendingChangeSet = useEditorStore((state) => state.setPendingChangeSet);
  const discardPendingChangeSet = useEditorStore((state) => state.discardPendingChangeSet);
  const applyPendingChangeSet = useEditorStore((state) => state.applyPendingChangeSet);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function requestChanges() {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/ai/changes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ prompt, currentDocument: survey })
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
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>AI Assistant</h3>
      <p style={{ margin: 0, color: '#667085' }}>描述你想生成或修改的问卷内容，系统会先生成变更预览，再决定是否应用。</p>
      <textarea
        aria-label="AI prompt"
        onChange={(event) => setPrompt(event.target.value)}
        placeholder="例如：生成一个用户满意度问卷"
        rows={8}
        value={prompt}
      />
      <button disabled={!prompt.trim() || isLoading} onClick={requestChanges} type="button">
        {isLoading ? '生成中...' : '生成修改建议'}
      </button>
      {error ? <p style={{ color: '#b42318', margin: 0 }}>{error}</p> : null}
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
