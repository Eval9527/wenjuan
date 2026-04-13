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

  if (!storeRef.current) {
    storeRef.current = createEditorStore({
      surveyId,
      initialSurvey: initialSurvey ?? createEmptySurvey({ id: surveyId })
    });
  }

  const activePanel = useMemo(() => {
    return activeTab === 'ai' ? <AiAssistantPanel /> : <InspectorPanel />;
  }, [activeTab]);

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
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '240px minmax(0, 1fr) 360px',
          gridTemplateRows: '80px minmax(0, 1fr)',
          minHeight: '100vh'
        }}
      >
        <EditorTopBar
          onPublish={onPublish}
          persistenceState={persistenceState}
          publishState={publishState}
          responseCount={responseCount}
          surveyId={surveyId}
        />
        <BlockPalette />
        <SurveyCanvas />
        <aside
          style={{
            borderLeft: '1px solid #d7deea',
            background: '#fff',
            padding: 20,
            display: 'flex',
            flexDirection: 'column',
            gap: 16
          }}
        >
          <div aria-label="Editor side panel tabs" role="tablist" style={{ display: 'flex', gap: 8 }}>
            <button
              aria-selected={activeTab === 'ai'}
              onClick={() => setActiveTab('ai')}
              role="tab"
              type="button"
            >
              AI 助手
            </button>
            <button
              aria-selected={activeTab === 'inspector'}
              onClick={() => setActiveTab('inspector')}
              role="tab"
              type="button"
            >
              属性面板
            </button>
          </div>
          {activePanel}
        </aside>
      </div>
    </EditorStoreContext.Provider>
  );
}
