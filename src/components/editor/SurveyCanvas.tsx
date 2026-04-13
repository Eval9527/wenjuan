'use client';

import { SurveyRenderer } from '@/features/renderer/SurveyRenderer';
import { useEditorStore } from './editor-store-context';

function EmptyCanvasState() {
  return (
    <div style={{ maxWidth: 420, textAlign: 'center' }}>
      <h2>先从 AI 开始</h2>
      <p>描述你想创建的问卷，或者先从左侧添加一个基础题型。</p>
    </div>
  );
}

export function SurveyCanvas() {
  const survey = useEditorStore((state) => state.survey);
  const previewMode = useEditorStore((state) => state.previewMode);

  return (
    <section
      style={{
        padding: 24,
        display: 'flex',
        justifyContent: 'center',
        background: '#eef2f8'
      }}
    >
      <div
        data-preview-mode={previewMode}
        data-testid="preview-frame"
        style={{
          width: previewMode === 'mobile' ? 390 : '100%',
          maxWidth: 860,
          minHeight: 560,
          borderRadius: 24,
          border: '1px solid #d7deea',
          background: '#fff',
          padding: 24,
          boxSizing: 'border-box'
        }}
      >
        {survey.blocks.length ? <SurveyRenderer document={survey} mode="editor-preview" /> : <EmptyCanvasState />}
      </div>
    </section>
  );
}
