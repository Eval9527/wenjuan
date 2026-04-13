'use client';

import { useMemo, useRef, useState } from 'react';
import { createEditorStore } from '@/features/editor-core/store';
import { AiAssistantPanel } from './AiAssistantPanel';
import { BlockPalette } from './BlockPalette';
import { EditorTopBar } from './EditorTopBar';
import { EditorStoreContext } from './editor-store-context';
import { InspectorPanel } from './InspectorPanel';
import { SurveyCanvas } from './SurveyCanvas';

export function EditorShell({ surveyId }: { surveyId: string }) {
  const storeRef = useRef<ReturnType<typeof createEditorStore> | null>(null);
  const [activeTab, setActiveTab] = useState<'ai' | 'inspector'>('ai');

  if (!storeRef.current) {
    storeRef.current = createEditorStore({ surveyId });
  }

  const activePanel = useMemo(() => {
    return activeTab === 'ai' ? <AiAssistantPanel /> : <InspectorPanel />;
  }, [activeTab]);

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
        <EditorTopBar surveyId={surveyId} />
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
              AI Assistant
            </button>
            <button
              aria-selected={activeTab === 'inspector'}
              onClick={() => setActiveTab('inspector')}
              role="tab"
              type="button"
            >
              Inspector
            </button>
          </div>
          {activePanel}
        </aside>
      </div>
    </EditorStoreContext.Provider>
  );
}
