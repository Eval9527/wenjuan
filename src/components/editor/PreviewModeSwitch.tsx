'use client';

import { useEditorStore } from './editor-store-context';

export function PreviewModeSwitch() {
  const previewMode = useEditorStore((state) => state.previewMode);
  const setPreviewMode = useEditorStore((state) => state.setPreviewMode);

  return (
    <div aria-label="预览模式切换" style={{ display: 'inline-flex', gap: 8 }}>
      <button
        aria-pressed={previewMode === 'desktop'}
        onClick={() => setPreviewMode('desktop')}
        type="button"
      >
        桌面预览
      </button>
      <button
        aria-pressed={previewMode === 'mobile'}
        onClick={() => setPreviewMode('mobile')}
        type="button"
      >
        移动预览
      </button>
    </div>
  );
}
