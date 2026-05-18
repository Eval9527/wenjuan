'use client';

import { useEditorStore } from './editor-store-context';

function PreviewButton({
  active,
  children,
  icon,
  onClick,
  disabled = false
}: {
  active: boolean;
  children: React.ReactNode;
  icon: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      aria-pressed={active}
      className={[
        'editor-preview-switch__button',
        active ? 'editor-preview-switch__button--active' : ''
      ].join(' ')}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      <span aria-hidden="true" className="editor-preview-switch__icon">{icon}</span>
      <span>{children}</span>
    </button>
  );
}

export function PreviewModeSwitch({ disabled = false }: { disabled?: boolean }) {
  const previewMode = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);

  return (
    <div aria-label="预览模式切换" className="editor-preview-switch">
      <span className="editor-preview-switch__label">画布尺寸</span>
      <PreviewButton
        active={previewMode === 'desktop'}
        disabled={disabled}
        icon={
          <svg fill="none" height="14" viewBox="0 0 18 14" width="18" xmlns="http://www.w3.org/2000/svg">
            <rect height="10" rx="1.5" stroke="currentColor" strokeWidth="1.5" width="16" x="1" y="1" />
            <path d="M6.5 13h5" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
        }
        onClick={() => setPreviewMode('desktop')}
      >
        桌面预览
      </PreviewButton>
      <PreviewButton
        active={previewMode === 'mobile'}
        disabled={disabled}
        icon={
          <svg fill="none" height="16" viewBox="0 0 12 16" width="12" xmlns="http://www.w3.org/2000/svg">
            <rect height="14" rx="2" stroke="currentColor" strokeWidth="1.5" width="9" x="1.5" y="1" />
            <path d="M5 12.5h2" stroke="currentColor" strokeLinecap="round" strokeWidth="1.5" />
          </svg>
        }
        onClick={() => setPreviewMode('mobile')}
      >
        移动预览
      </PreviewButton>
    </div>
  );
}
