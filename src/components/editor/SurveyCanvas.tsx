'use client';

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { blockRegistry } from '@/features/block-library/registry';
import { resolveDragMove } from '@/features/editor-core/drag-sort';
import type { SurveyBlock } from '@/features/survey-schema/schema';
import { useEditorStore } from './editor-store-context';

function EmptyCanvasState() {
  return (
    <div style={{ maxWidth: 420, textAlign: 'center' }}>
      <h2>先从 AI 开始</h2>
      <p>描述你想创建的问卷，或者先从左侧添加一个基础题型。</p>
    </div>
  );
}

function SortableCanvasBlockCard({
  block,
  index,
  total,
  moveUpTargetId,
  moveDownTargetId,
  selectedBlockId,
  onSelect,
  onMove,
  onRemove
}: {
  block: SurveyBlock;
  index: number;
  total: number;
  moveUpTargetId?: string;
  moveDownTargetId?: string;
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  onMove: (blockId: string, targetBlockId?: string) => void;
  onRemove: (blockId: string) => void;
}) {
  const Renderer = blockRegistry[block.type];
  const {
    attributes,
    listeners,
    setActivatorNodeRef,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: block.id });
  const isSelected = selectedBlockId === block.id;

  return (
    <article
      aria-selected={isSelected}
      data-testid="canvas-block-card"
      onClick={() => onSelect(block.id)}
      ref={setNodeRef}
      style={{
        border: isSelected ? '2px solid #0f62fe' : '1px solid #d7deea',
        borderRadius: 18,
        padding: 16,
        boxShadow: isSelected ? '0 0 0 4px rgba(15, 98, 254, 0.08)' : 'none',
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDragging ? 0.7 : 1,
        background: '#fff',
        transform: CSS.Transform.toString(transform),
        transition
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
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button
            aria-label={`拖拽排序 ${block.label}`}
            onClick={(event) => event.stopPropagation()}
            ref={setActivatorNodeRef}
            style={{
              border: '1px solid #d7deea',
              borderRadius: 10,
              background: '#f8fafc',
              padding: '8px 10px',
              cursor: isDragging ? 'grabbing' : 'grab',
              touchAction: 'none'
            }}
            type="button"
            {...attributes}
            {...listeners}
          >
            ⋮⋮
          </button>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <strong>{block.label}</strong>
            <span style={{ color: '#667085', fontSize: 12 }}>#{index + 1} · {block.type}</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            aria-label={`上移 ${block.label}`}
            disabled={index === 0}
            onClick={(event) => {
              event.stopPropagation();
              onMove(block.id, moveUpTargetId);
            }}
            type="button"
          >
            ↑
          </button>
          <button
            aria-label={`下移 ${block.label}`}
            disabled={index === total - 1}
            onClick={(event) => {
              event.stopPropagation();
              onMove(block.id, moveDownTargetId);
            }}
            type="button"
          >
            ↓
          </button>
          <button
            aria-label={`删除 ${block.label}`}
            onClick={(event) => {
              event.stopPropagation();
              onRemove(block.id);
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
}

export function SurveyCanvas() {
  const survey = useEditorStore((state) => state.survey);
  const previewMode = useEditorStore((state) => state.previewMode);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const selectBlock = useEditorStore((state) => state.selectBlock);
  const moveBlock = useEditorStore((state) => state.moveBlock);
  const removeBlock = useEditorStore((state) => state.removeBlock);
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates
    })
  );

  function handleDragEnd(event: DragEndEvent) {
    const resolution = resolveDragMove(
      survey.blocks.map((block) => block.id),
      String(event.active.id),
      event.over ? String(event.over.id) : null
    );

    if (!resolution.shouldMove) {
      return;
    }

    moveBlock(String(event.active.id), resolution.targetBlockId);
  }

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
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={survey.blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {survey.blocks.map((block, index) => {
                  const moveUpTargetId = index > 0 ? survey.blocks[index - 1]?.id : undefined;
                  const moveDownTargetId = survey.blocks[index + 2]?.id;

                  return (
                    <SortableCanvasBlockCard
                      block={block}
                      index={index}
                      key={block.id}
                      moveDownTargetId={moveDownTargetId}
                      moveUpTargetId={moveUpTargetId}
                      onMove={(blockId, targetBlockId) => moveBlock(blockId, targetBlockId)}
                      onRemove={removeBlock}
                      onSelect={selectBlock}
                      selectedBlockId={selectedBlockId}
                      total={survey.blocks.length}
                    />
                  );
                })}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <EmptyCanvasState />
        )}
      </div>
    </section>
  );
}
