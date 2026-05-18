'use client';

import { useEffect, useMemo, useState } from 'react';
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
  ariaLabel,
  className,
  disabled,
  icon,
  title,
  onClick
}: {
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
  icon: React.ReactNode;
  title: string;
  onClick?: () => void;
}) {
  return (
    <button
      aria-label={ariaLabel ?? title}
      title={title}
      className={['editor-toolbar-btn p-2 rounded hover:bg-[#f1f5f9] disabled:opacity-50 disabled:cursor-not-allowed', className].filter(Boolean).join(' ')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {icon}
    </button>
  );
}

export function EditorTopBar({
  surveyId,
  persistenceState,
  publishState,
  onPublish,
  onBack,
  interactionLocked = false
}: {
  surveyId: string;
  persistenceState?: EditorPersistenceState;
  publishState?: EditorPublishState;
  onPublish?: () => void;
  onBack?: () => void;
  interactionLocked?: boolean;
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
  const duplicateBlock = useEditorStore((state) => state.duplicateBlock);
  const [copyMessage, setCopyMessage] = useState('');
  const [draftTitle, setDraftTitle] = useState(surveyTitle);
  const [isComposingTitle, setIsComposingTitle] = useState(false);
  const isLocked = Boolean(publishState?.publishedVersion);
  const isEditingDisabled = isLocked || interactionLocked;
  const shouldConfirmLeave = !isLocked && (persistenceState?.status === 'saving' || persistenceState?.status === 'error');
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

  useEffect(() => {
    if (!isComposingTitle) {
      setDraftTitle(surveyTitle);
    }
  }, [isComposingTitle, surveyTitle]);

  function commitTitle(nextTitle: string) {
    if (!isEditingDisabled && nextTitle.trim() && nextTitle !== surveyTitle) {
      updateSurveyTitle(nextTitle);
    }
  }

  function handleBack() {
    if (shouldConfirmLeave && !window.confirm('当前更改还没有保存完成，确定要返回上一页吗？')) {
      return;
    }

    if (onBack) {
      onBack();
      return;
    }

    if (window.history.length > 1) {
      window.history.back();
      return;
    }

    window.location.href = '/';
  }

  async function handleCopyShareLink() {
    if (!fillUrl || !navigator.clipboard?.writeText) {
      setCopyMessage('环境不支持自动复制');
      setTimeout(() => setCopyMessage(''), 2000);
      return;
    }

    try {
      await navigator.clipboard.writeText(fillUrl);
      setCopyMessage('分享链接已复制');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      setCopyMessage('复制失败');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  }

  return (
    <header className="editor-topbar">
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <button onClick={handleBack} className="ui-btn ui-btn-ghost !px-2" title="返回上一页" aria-label="返回上一页">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <input
          aria-label="问卷标题"
          className="editor-title-input"
          disabled={isEditingDisabled}
          onBlur={(event) => commitTitle(event.target.value)}
          onChange={(event) => {
            setDraftTitle(event.target.value);
            if (!isComposingTitle) {
              commitTitle(event.target.value);
            }
          }}
          onCompositionEnd={(event) => {
            setIsComposingTitle(false);
            setDraftTitle(event.currentTarget.value);
            commitTitle(event.currentTarget.value);
          }}
          onCompositionStart={() => setIsComposingTitle(true)}
          type="text"
          value={draftTitle}
          placeholder="输入问卷标题..."
        />
        <div className="hidden md:flex items-center gap-2">
          {publishState?.publishedVersion ? <span className="ui-chip ui-chip-success">公开填写中</span> : <span className="ui-chip">编辑中</span>}
          {isLocked ? <span className="ui-chip ui-chip-warning">答卷保护中</span> : null}
          {persistenceState?.message ? (
            <span className={['text-xs truncate max-w-[160px]', persistenceState.status === 'error' ? 'text-[#b42318]' : 'text-[#94a3b8]'].join(' ')}>
              {persistenceState.message}
            </span>
          ) : null}
          {publishState?.message ? (
            <span className={['text-xs truncate max-w-[160px]', publishState.status === 'error' ? 'text-[#b42318]' : 'text-[#94a3b8]'].join(' ')}>
              {publishState.message}
            </span>
          ) : null}
          {copyMessage && <span className="text-xs text-[#2563eb]">{copyMessage}</span>}
        </div>
        {isLocked ? <span className="sr-only">当前问卷已发布，编辑已锁定</span> : null}
        {interactionLocked ? <span className="sr-only">AI 生成中，编辑暂时锁定</span> : null}
      </div>

      <div className="editor-toolbar-cluster shrink-0 hidden lg:flex items-center gap-1">
        <ToolbarButton ariaLabel="撤销" disabled={!canUndo || isEditingDisabled} title="撤销" onClick={undo} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/></svg>} />
        <ToolbarButton ariaLabel="重做" disabled={!canRedo || isEditingDisabled} title="重做" onClick={redo} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 7v6h-6"/><path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3l3 2.7"/></svg>} />
        <div className="w-px h-4 bg-[#cbd5e1] mx-1 opacity-60" />
        <ToolbarButton ariaLabel="复制当前题目" disabled={!selectedBlock || isEditingDisabled} title="复制" onClick={() => selectedBlock && duplicateBlock(selectedBlock.id)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>} />
        <div className="w-px h-4 bg-[#cbd5e1] mx-1 opacity-60" />
        <ToolbarButton ariaLabel="上移当前题目" disabled={!selectedBlock || selectedIndex === 0 || isEditingDisabled} title="上移" onClick={() => selectedBlock && moveBlock(selectedBlock.id, moveUpTargetId)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m18 15-6-6-6 6"/></svg>} />
        <ToolbarButton ariaLabel="下移当前题目" disabled={!selectedBlock || selectedIndex === -1 || selectedIndex === blocks.length - 1 || isEditingDisabled} title="下移" onClick={() => selectedBlock && moveBlock(selectedBlock.id, moveDownTargetId)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>} />
        <div className="w-px h-4 bg-[#cbd5e1] mx-1 opacity-60" />
        <ToolbarButton ariaLabel="删除当前题目" className="text-[#b42318] hover:bg-[#fef2f2]" disabled={!selectedBlock || isEditingDisabled} title="删除" onClick={() => selectedBlock && removeBlock(selectedBlock.id)} icon={<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>} />
      </div>

      <div className="flex flex-1 items-center justify-end gap-3 shrink-0">
        <PreviewModeSwitch disabled={interactionLocked} />
        {publishState?.publishedVersion ? (
          <button aria-label="复制分享链接" className="ui-btn ui-btn-secondary" onClick={handleCopyShareLink} type="button">
            复制链接
          </button>
        ) : null}
        <button
          aria-label="发布问卷"
          className="ui-btn ui-btn-primary"
          disabled={!onPublish || publishState?.status === 'publishing' || isEditingDisabled}
          onClick={onPublish}
          type="button"
        >
          {publishState?.status === 'publishing' ? '发布中...' : '发布问卷'}
        </button>
      </div>
    </header>
  );
}
