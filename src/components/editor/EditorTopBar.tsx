'use client';

import { useMemo, useState } from 'react';
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

function ToolbarButton({
  className,
  disabled,
  label,
  onClick
}: {
  className?: string;
  disabled?: boolean;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      className={['ui-btn ui-btn-secondary', className].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {label}
    </button>
  );
}

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
  const blocks = useEditorStore((state) => state.survey.blocks);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const canUndo = useEditorStore((state) => state.canUndo);
  const canRedo = useEditorStore((state) => state.canRedo);
  const updateSurveyTitle = useEditorStore((state) => state.updateSurveyTitle);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const moveBlock = useEditorStore((state) => state.moveBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);
  const [copyMessage, setCopyMessage] = useState('');
  const isLocked = Boolean(publishState?.publishedVersion && (responseCount ?? 0) > 0);
  const selectedIndex = useMemo(
    () => blocks.findIndex((block) => block.id === selectedBlockId),
    [blocks, selectedBlockId]
  );
  const selectedBlock = selectedIndex >= 0 ? blocks[selectedIndex] : null;
  const resolvedFillPath = publishState?.publishedVersion ? `/f/${surveyId}` : null;
  const fillUrl = useMemo(() => {
    if (!resolvedFillPath) {
      return null;
    }

    if (typeof window === 'undefined') {
      return resolvedFillPath;
    }

    return new URL(resolvedFillPath, window.location.origin).toString();
  }, [resolvedFillPath]);
  const moveUpTargetId = selectedIndex > 0 ? blocks[selectedIndex - 1]?.id : undefined;
  const moveDownTargetId = selectedIndex >= 0 ? blocks[selectedIndex + 2]?.id : undefined;

  async function handleCopyShareLink() {
    if (!fillUrl || !navigator.clipboard?.writeText) {
      setCopyMessage('当前环境不支持自动复制');
      return;
    }

    try {
      await navigator.clipboard.writeText(fillUrl);
      setCopyMessage('分享链接已复制');
    } catch (error) {
      setCopyMessage(error instanceof Error ? '复制失败，请手动复制链接' : '复制失败');
    }
  }

  return (
    <header className="col-span-full border-b border-[#d7dee8] bg-white/95 px-4 py-4 backdrop-blur md:px-6">
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_auto_auto] xl:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {publishState?.publishedVersion ? <span className="ui-chip ui-chip-success">公开填写中</span> : <span className="ui-chip">草稿编辑中</span>}
            {isLocked ? <span className="ui-chip ui-chip-warning">答卷保护中</span> : null}
          </div>

          <label className="ui-field max-w-[520px]">
            <span className="ui-field-label">问卷标题</span>
            <input
              aria-label="问卷标题"
              className="ui-input text-[18px] font-[700]"
              disabled={isLocked}
              onChange={(event) => updateSurveyTitle(event.target.value)}
              type="text"
              value={surveyTitle}
            />
          </label>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-[#667085]">
            {persistenceState ? (
              <span className={persistenceState.status === 'error' ? 'text-[#b42318]' : ''}>{persistenceState.message}</span>
            ) : null}
            {publishState ? (
              <span className={publishState.status === 'error' ? 'text-[#b42318]' : ''}>{publishState.message}</span>
            ) : null}
            {typeof responseCount === 'number' ? <span>已收集 {responseCount} 份答卷</span> : null}
            {copyMessage ? <span>{copyMessage}</span> : null}
          </div>

          {isLocked ? <p className="m-0 text-sm font-medium text-[#b54708]">已收集答卷，当前问卷已锁定</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-2 xl:justify-center">
          <ToolbarButton disabled={!canUndo || isLocked} label="撤销" onClick={undo} />
          <ToolbarButton disabled={!canRedo || isLocked} label="重做" onClick={redo} />
          <span className="hidden h-8 w-px bg-[#e4e7ec] xl:block" />
          <ToolbarButton
            disabled={!selectedBlock || selectedIndex === 0 || isLocked}
            label="上移当前题目"
            onClick={() => selectedBlock && moveBlock(selectedBlock.id, moveUpTargetId)}
          />
          <ToolbarButton
            disabled={!selectedBlock || selectedIndex === -1 || selectedIndex === blocks.length - 1 || isLocked}
            label="下移当前题目"
            onClick={() => selectedBlock && moveBlock(selectedBlock.id, moveDownTargetId)}
          />
          <ToolbarButton
            className="ui-btn-danger"
            disabled={!selectedBlock || isLocked}
            label="删除当前题目"
            onClick={() => selectedBlock && removeBlock(selectedBlock.id)}
          />
        </div>

        <div className="flex flex-wrap items-center justify-start gap-2 xl:justify-end">
          <PreviewModeSwitch />
          <button
            className="ui-btn ui-btn-primary"
            disabled={!onPublish || publishState?.status === 'publishing' || isLocked}
            onClick={onPublish}
            type="button"
          >
            {publishState?.status === 'publishing' ? '发布中...' : '发布问卷'}
          </button>
          {resolvedFillPath ? (
            <a className="ui-btn ui-btn-secondary" href={resolvedFillPath}>
              打开填写页
            </a>
          ) : null}
          {publishState?.publishedVersion ? (
            <button className="ui-btn ui-btn-ghost" onClick={handleCopyShareLink} type="button">
              复制分享链接
            </button>
          ) : null}
        </div>
      </div>
    </header>
  );
}
