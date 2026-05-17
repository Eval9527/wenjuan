'use client';

import { useEditorStore } from './editor-store-context';

function PreviewButton({
  active,
  children,
  onClick,
  disabled = false
}: {
  active: boolean;
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        'ui-btn min-w-[88px] px-3',
        active ? 'ui-btn-primary shadow-none' : 'ui-btn-secondary bg-[#f8fafc]'
      ].join(' ')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
    </button>
  );
}

export function PreviewModeSwitch({ disabled = false }: { disabled?: boolean }) {
  const previewMode = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);

  return (
    <div aria-label="预览模式切换" className="editor-preview-switch">
      <PreviewButton active={previewMode === 'desktop'} disabled={disabled} onClick={() => setPreviewMode('desktop')}>
        桌面预览
      </PreviewButton>
      <PreviewButton active={previewMode === 'mobile'} disabled={disabled} onClick={() => setPreviewMode('mobile')}>
        移动预览
      </PreviewButton>
    </div>
  );
}
