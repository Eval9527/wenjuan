'use client';

import { blockRegistry } from '@/features/block-library/registry';
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
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const selectBlock = useEditorStore((state) => state.selectBlock);
  const moveBlock = useEditorStore((state) => state.moveBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);

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
        {survey.blocks.length ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {survey.blocks.map((block, index) => {
              const Renderer = blockRegistry[block.type];
              const isSelected = selectedBlockId === block.id;
              const moveUpTargetId = index > 0 ? survey.blocks[index - 1]?.id : undefined;
              const moveDownTargetId = survey.blocks[index + 2]?.id;

              return (
                <article
                  aria-selected={isSelected}
                  data-testid="canvas-block-card"
                  key={block.id}
                  onClick={() => selectBlock(block.id)}
                  style={{
                    border: isSelected ? '2px solid #0f62fe' : '1px solid #d7deea',
                    borderRadius: 18,
                    padding: 16,
                    boxShadow: isSelected ? '0 0 0 4px rgba(15, 98, 254, 0.08)' : 'none',
                    cursor: 'pointer'
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 12,
                      marginBottom: 12
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                      <strong>{block.label}</strong>
                      <span style={{ color: '#667085', fontSize: 12 }}>#{index + 1} · {block.type}</span>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        aria-label={`上移 ${block.label}`}
                        disabled={index === 0}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveBlock(block.id, moveUpTargetId);
                        }}
                        type="button"
                      >
                        ↑
                      </button>
                      <button
                        aria-label={`下移 ${block.label}`}
                        disabled={index === survey.blocks.length - 1}
                        onClick={(event) => {
                          event.stopPropagation();
                          moveBlock(block.id, moveDownTargetId);
                        }}
                        type="button"
                      >
                        ↓
                      </button>
                      <button
                        aria-label={`删除 ${block.label}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          removeBlock(block.id);
                        }}
                        type="button"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                  <Renderer block={block} mode="editor-preview" />
                </article>
              );
            })}
          </div>
        ) : (
          <EmptyCanvasState />
        )}
      </div>
    </section>
  );
}
