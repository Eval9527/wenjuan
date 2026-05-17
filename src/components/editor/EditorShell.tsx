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

function SideTab({
  active,
  children,
  tone = 'default',
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  tone?: 'default' | 'primary';
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={[
        'editor-side-tab',
        active ? (tone === 'primary' ? 'editor-side-tab--active editor-side-tab--primary' : 'editor-side-tab--active') : ''
      ].join(' ')}
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
  onPublish,
  responseCount,
  onSurveyChange
}: {
  surveyId: string;
  initialSurvey?: SurveyDocument;
  persistenceState?: EditorPersistenceState;
  publishState?: EditorPublishState;
  onPublish?: () => void;
  responseCount?: number;
  onSurveyChange?: (survey: SurveyDocument) => void;
}) {
  const storeRef = useRef<ReturnType<typeof createEditorStore> | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'inspector'>('ai');
  const isLocked = Boolean(publishState?.publishedVersion);

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
      return <AiAssistantPanel readOnly={isLocked} />;
    }
    return <InspectorPanel readOnly={isLocked} />;
  }, [activeTab, isLocked]);

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
          persistenceState={persistenceState}
          publishState={publishState}
          responseCount={responseCount}
          surveyId={surveyId}
        />
        <div className="editor-main-area">
          <BlockPalette readOnly={isLocked} />
          <SurveyCanvas readOnly={isLocked} />
          <aside className="editor-side-panel editor-side-panel--right">
            <div aria-label="面板切换" className="editor-side-tabs" role="tablist">
              <SideTab active={activeTab === 'ai'} onClick={() => setActiveTab('ai')} tone="primary">AI 助手</SideTab>
              <SideTab active={activeTab === 'inspector'} onClick={() => setActiveTab('inspector')}>属性面板</SideTab>
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
