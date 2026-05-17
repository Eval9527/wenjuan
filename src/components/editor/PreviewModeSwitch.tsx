'use client';

import { useEditorStore } from './editor-store-context';

function PreviewButton({
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
      aria-pressed={active}
      className={[
        'ui-btn min-w-[88px] px-3',
        active ? 'ui-btn-primary shadow-none' : 'ui-btn-secondary bg-[#f8fafc]'
      ].join(' ')}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function PreviewModeSwitch() {
  const previewMode = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);

  return (
    <div aria-label="预览模式切换" className="editor-preview-switch">
      <PreviewButton active={previewMode === 'desktop'} onClick={() => setPreviewMode('desktop')}>
        桌面预览
      </PreviewButton>
      <PreviewButton active={previewMode === 'mobile'} onClick={() => setPreviewMode('mobile')}>
        移动预览
      </PreviewButton>
    </div>
  );
}
