'use client';

import { PreviewModeSwitch } from './PreviewModeSwitch';
import { useEditorStore } from './editor-store-context';

export type EditorPersistenceState = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message: string;
};

export function EditorTopBar({
  surveyId,
  persistenceState
}: {
  surveyId: string;
  persistenceState?: EditorPersistenceState;
}) {
  const surveyTitle = useEditorStore((state) => state.survey.title);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);

  return (
    <header
      style={{
        gridColumn: '1 / 4',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '16px 24px',
        borderBottom: '1px solid #d7deea',
        background: '#fff'
      }}
    >
      <div>
        <strong>{surveyTitle}</strong>
        <p style={{ margin: '4px 0 0', color: '#667085' }}>Survey ID: {surveyId}</p>
        {persistenceState ? (
          <p style={{ margin: '4px 0 0', color: persistenceState.status === 'error' ? '#b42318' : '#667085' }}>
            {persistenceState.message}
          </p>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button disabled={!canUndo} onClick={undo} type="button">
          Undo
        </button>
        <button disabled={!canRedo} onClick={redo} type="button">
          Redo
        </button>
        <PreviewModeSwitch />
      </div>
    </header>
  );
}
