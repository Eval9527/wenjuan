'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createEditorStore } from '@/features/editor-core/store';
import type { SurveyResponseRecord } from '@/features/persistence/contracts';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import type { SurveyDocument } from '@/features/survey-schema/schema';
import { AiAssistantPanel } from './AiAssistantPanel';
import { BlockPalette } from './BlockPalette';
import { EditorTopBar, type EditorPersistenceState, type EditorPublishState } from './EditorTopBar';
import { EditorStoreContext } from './editor-store-context';
import { InspectorPanel } from './InspectorPanel';
import { SurveyDeliveryPanel, type ResponseFeedState } from './SurveyDeliveryPanel';
import { SurveyCanvas } from './SurveyCanvas';

export { type EditorPersistenceState } from './EditorTopBar';
export { type EditorPublishState } from './EditorTopBar';

function SideTab({
  active,
  children,
  onClick
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
}) {
  return (
    <button
      aria-selected={active}
      className={[
        'ui-btn flex-1',
        active ? 'ui-btn-primary shadow-none' : 'ui-btn-secondary bg-[#f8fafc]'
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
  recentResponses,
  responseFeedState,
  onRefreshResponses,
  onSurveyChange
}: {
  surveyId: string;
  initialSurvey?: SurveyDocument;
  persistenceState?: EditorPersistenceState;
  publishState?: EditorPublishState;
  onPublish?: () => void;
  responseCount?: number;
  recentResponses?: SurveyResponseRecord[];
  responseFeedState?: ResponseFeedState;
  onRefreshResponses?: () => void;
  onSurveyChange?: (survey: SurveyDocument) => void;
}) {
  const storeRef = useRef<ReturnType<typeof createEditorStore> | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'inspector'>('ai');
  const isLocked = Boolean(publishState?.publishedVersion && (responseCount ?? 0) > 0);

  if (!storeRef.current) {
    storeRef.current = createEditorStore({
      surveyId,
      initialSurvey: initialSurvey ?? createEmptySurvey({ id: surveyId })
    });
  }

  const activePanel = useMemo(() => {
    return activeTab === 'ai' ? <AiAssistantPanel readOnly={isLocked} /> : <InspectorPanel readOnly={isLocked} />;
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
      <div className="grid min-h-screen bg-[#f3f5f8] xl:grid-cols-[280px_minmax(0,1fr)_360px] xl:grid-rows-[auto_minmax(0,1fr)]">
        <EditorTopBar
          onPublish={onPublish}
          persistenceState={persistenceState}
          publishState={publishState}
          responseCount={responseCount}
          surveyId={surveyId}
        />
        <BlockPalette readOnly={isLocked} />
        <SurveyCanvas readOnly={isLocked} />
        <aside className="border-l border-[#d7dee8] bg-white px-4 py-5 md:px-5">
          <div className="flex h-full flex-col gap-4">
            <div aria-label="Editor side panel tabs" className="flex gap-2" role="tablist">
              <SideTab active={activeTab === 'ai'} onClick={() => setActiveTab('ai')}>
                AI 助手
              </SideTab>
              <SideTab active={activeTab === 'inspector'} onClick={() => setActiveTab('inspector')}>
                属性面板
              </SideTab>
            </div>
            <div className="flex flex-1 flex-col gap-4 overflow-auto pr-1">
              <section className="ui-panel p-4">{activePanel}</section>
              <SurveyDeliveryPanel
                onRefreshResponses={onRefreshResponses}
                publishedVersion={publishState?.publishedVersion ?? null}
                recentResponses={recentResponses}
                responseCount={responseCount ?? 0}
                responseFeedState={responseFeedState}
                surveyId={surveyId}
              />
            </div>
          </div>
        </aside>
      </div>
    </EditorStoreContext.Provider>
  );
}
