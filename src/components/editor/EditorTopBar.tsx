'use client';

import { PreviewModeSwitch } from './PreviewModeSwitch';
import { useEditorStore } from './editor-store-context';

export type EditorPersistenceState = {
  status: 'idle' | 'saving' | 'saved' | 'error';
  message: string;
};

export type EditorPublishState = {
  status: 'idle' | 'publishing' | 'published' | 'error';
  message: string;
  publishedVersion: number | null;
};

export function EditorTopBar({
  surveyId,
  persistenceState,
  publishState,
  onPublish,
  responseCount
}: {
  surveyId: string;
  persistenceState?: EditorPersistenceState;
  publishState?: EditorPublishState;
  onPublish?: () => void;
  responseCount?: number;
}) {
  const surveyTitle = useEditorStore((state) => state.survey.title);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const updateSurveyTitle = useEditorStore((state) => state.updateSurveyTitle);
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
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ fontSize: 12, color: '#667085' }}>问卷标题</span>
          <input
            aria-label="问卷标题"
            onChange={(event) => updateSurveyTitle(event.target.value)}
            style={{
              minWidth: 280,
              border: '1px solid #d7deea',
              borderRadius: 12,
              padding: '10px 14px',
              fontSize: 18,
              fontWeight: 700
            }}
            type="text"
            value={surveyTitle}
          />
        </label>
        <p style={{ margin: '4px 0 0', color: '#667085' }}>Survey ID: {surveyId}</p>
        {persistenceState ? (
          <p style={{ margin: '4px 0 0', color: persistenceState.status === 'error' ? '#b42318' : '#667085' }}>
            {persistenceState.message}
          </p>
        ) : null}
        {publishState ? (
          <p style={{ margin: '4px 0 0', color: publishState.status === 'error' ? '#b42318' : '#667085' }}>
            {publishState.message}
          </p>
        ) : null}
        {typeof responseCount === 'number' ? (
          <p style={{ margin: '4px 0 0', color: '#667085' }}>已收集 {responseCount} 份答卷</p>
        ) : null}
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button disabled={!canUndo} onClick={undo} type="button">
          撤销
        </button>
        <button disabled={!canRedo} onClick={redo} type="button">
          重做
        </button>
        <button disabled={!onPublish || publishState?.status === 'publishing'} onClick={onPublish} type="button">
          {publishState?.status === 'publishing' ? '发布中...' : '发布问卷'}
        </button>
        <a href={`/f/${surveyId}`}>打开填写页</a>
        <PreviewModeSwitch />
      </div>
    </header>
  );
}
