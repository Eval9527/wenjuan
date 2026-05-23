'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createEditorStore } from '@/features/editor-core/store';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import type { SurveyDocument } from '@/features/survey-schema/schema';
import { AiAssistantPanel } from './AiAssistantPanel';
import { BlockPalette } from './BlockPalette';
import { EditorTopBar, type EditorPersistenceState, type EditorPublishState } from './EditorTopBar';
import { EditorStoreContext } from './editor-store-context';
import { InspectorPanel } from './InspectorPanel';
import { SurveyCanvas } from './SurveyCanvas';

export { type EditorPersistenceState } from './EditorTopBar';
export { type EditorPublishState } from './EditorTopBar';

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

function SideTab({
  active,
  children,
  tone = 'default',
  onClick,
  disabled = false
}: {
  active: boolean;
  children: React.ReactNode;
  tone?: 'default' | 'primary';
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-selected={active}
      className={[
        'editor-side-tab',
        active ? (tone === 'primary' ? 'editor-side-tab--active editor-side-tab--primary' : 'editor-side-tab--active') : ''
      ].join(' ')}
      disabled={disabled}
      onClick={onClick}
      role="tab"
      type="button"
    >
      {children}
    </button>
  );
}

export function EditorShell({
  surveyId,
  initialSurvey,
  persistenceState,
  publishState,
  initialAiPrompt,
  initialTemplateKey,
  onPublish,
  onSave,
  onBack,
  onSurveyChange,
  toastMessage
}: {
  surveyId: string;
  initialSurvey?: SurveyDocument;
  persistenceState?: EditorPersistenceState;
  publishState?: EditorPublishState;
  initialAiPrompt?: string;
  initialTemplateKey?: string;
  onPublish?: () => void;
  onSave?: () => void;
  onBack?: () => void;
  responseCount?: number;
  onSurveyChange?: (survey: SurveyDocument) => void;
  toastMessage?: string;
}) {
  const storeRef = useRef<ReturnType<typeof createEditorStore> | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'inspector'>('ai');
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const isLocked = Boolean(publishState?.publishedVersion);
  const isEditorInteractionLocked = isLocked || isAiGenerating;

  useEffect(() => {
    if (initialTemplateKey) {
      clearEditorUrlParams(['template']);
    }
  }, [initialTemplateKey]);

  if (!storeRef.current) {
    storeRef.current = createEditorStore({
      surveyId,
      initialSurvey: initialSurvey ?? createEmptySurvey({ id: surveyId })
    });
  }

  useEffect(() => {
    if (!storeRef.current) return;
    return storeRef.current.subscribe((state, previousState) => {
      if (state.selectedBlockId && state.selectedBlockId !== previousState.selectedBlockId) {
        setActiveTab('inspector');
      }
    });
  }, []);

  const activePanel = useMemo(() => {
    if (activeTab === 'ai') {
      return (
        <AiAssistantPanel
          initialPrompt={initialAiPrompt}
          isGenerating={isAiGenerating}
          onGenerationStateChange={setIsAiGenerating}
          readOnly={isLocked}
        />
      );
    }

    return <InspectorPanel readOnly={isEditorInteractionLocked} />;
  }, [activeTab, initialAiPrompt, isAiGenerating, isEditorInteractionLocked, isLocked]);

  useEffect(() => {
    if (isAiGenerating) {
      setActiveTab('ai');
    }
  }, [isAiGenerating]);

  useEffect(() => {
    if (!onSurveyChange || !storeRef.current) {
      return;
    }

    return storeRef.current.subscribe((state, previousState) => {
      if (state.survey !== previousState.survey) {
        onSurveyChange(state.survey);
      }
    });
  }, [onSurveyChange]);

  return (
    <EditorStoreContext.Provider value={storeRef.current}>
      <div className="editor-shell">
        <EditorTopBar
          onPublish={onPublish}
          onSave={onSave}
          onBack={onBack}
          persistenceState={persistenceState}
          publishState={publishState}
          interactionLocked={isAiGenerating}
          surveyId={surveyId}
          toastMessage={toastMessage}
        />
        <div className="editor-main-area">
          <BlockPalette readOnly={isEditorInteractionLocked} lockReason={isAiGenerating ? 'ai-generating' : 'published'} />
          <SurveyCanvas readOnly={isEditorInteractionLocked} />
          <aside className="editor-side-panel editor-side-panel--right">
            <div aria-label="面板切换" className="editor-side-tabs" role="tablist">
              <SideTab active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} tone="primary">AI 助手</SideTab>
              <SideTab active={activeTab === 'inspector'} disabled={isAiGenerating} onClick={() => setActiveTab('inspector')}>组件属性</SideTab>
            </div>
            <div className="editor-side-scroll flex-1 p-4">
              {activePanel}
            </div>
          </aside>
        </div>
      </div>
    </EditorStoreContext.Provider>
  );
}
