'use client';

import { Fragment, useEffect, useRef, useState, type DragEvent } from 'react';
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
import { resolveDragMove, restrictToVerticalTranslate } from '@/features/editor-core/drag-sort';
import type { SurveyBlock } from '@/features/survey-schema/schema';
import { isPaletteBlockType, PALETTE_BLOCK_DRAG_TYPE } from './editor-dnd';
import { useEditorStore } from './editor-store-context';

function getBlockDisplayLabel(block: SurveyBlock) {
  if (block.type === 'paragraph') {
    return block.content.split(/\n/).find((line) => line.trim())?.trim() ?? '段落';
  }

  return block.label;
}

function EmptyCanvasState() {
  return (
    <div className="flex flex-col items-center justify-center py-20 px-8 text-center text-[#64748b]">
      <div className="w-16 h-16 mb-4 rounded-full bg-[#f1f5f9] flex items-center justify-center text-2xl">✨</div>
      <h2 className="text-xl font-bold text-[#0f172a] mb-2">问卷内容为空</h2>
      <p className="text-sm mb-6 max-w-md">你可以从左侧拖拽组件，或者在右侧让 AI 帮你一键起草整份问卷内容。</p>
    </div>
  );
}

function CanvasDropIndicator() {
  return (
    <div className="editor-canvas-drop-indicator" data-testid="canvas-drop-indicator">
      <span>释放后插入到这里</span>
    </div>
  );
}

function hasPaletteBlockDrag(dataTransfer: DataTransfer) {
  return Array.from(dataTransfer.types ?? []).includes(PALETTE_BLOCK_DRAG_TYPE) ||
    isPaletteBlockType(dataTransfer.getData(PALETTE_BLOCK_DRAG_TYPE));
}

function SortableCanvasBlockCard({
  block,
  selectedBlockId,
  onSelect,
  readOnly,
  registerCanvasElement
}: {
  block: SurveyBlock;
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  readOnly: boolean;
  registerCanvasElement: (blockId: string, element: HTMLElement | null) => void;
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
  } = useSortable({ id: block.id, disabled: readOnly });
  const isSelected = selectedBlockId === block.id;
  const displayLabel = getBlockDisplayLabel(block);

  function setCanvasNode(node: HTMLElement | null) {
    setNodeRef(node);
    registerCanvasElement(block.id, node);
  }

  return (
    <article
      aria-selected={isSelected}
      className={[
        'editor-canvas-card',
        isSelected ? 'editor-canvas-card--selected' : ''
      ].join(' ')}
      data-testid="canvas-block-card"
      onClick={() => {
        if (!readOnly) {
          onSelect(block.id);
        }
      }}
      ref={setCanvasNode}
      style={{
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDragging ? 0.6 : 1,
        transform: CSS.Translate.toString(restrictToVerticalTranslate(transform)),
        transition,
        zIndex: isDragging ? 100 : 1
      }}
    >
      <button
        aria-label={`拖拽排序 ${displayLabel}`}
        className="editor-drag-handle"
        disabled={readOnly}
        onClick={(event) => event.stopPropagation()}
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
      >
        <svg width="16" height="20" viewBox="0 0 16 20" fill="currentColor">
          <circle cx="6" cy="4" r="1.5" />
          <circle cx="10" cy="4" r="1.5" />
          <circle cx="6" cy="10" r="1.5" />
          <circle cx="10" cy="10" r="1.5" />
          <circle cx="6" cy="16" r="1.5" />
          <circle cx="10" cy="16" r="1.5" />
        </svg>
      </button>

      <Renderer block={block} mode="editor-preview" />
    </article>
  );
}

export function SurveyCanvas({ readOnly = false }: { readOnly?: boolean }) {
  const survey = useEditorStore((state) => state.survey);
  const previewMode = useEditorStore((state) => state.previewMode);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const selectBlock = useEditorStore((state) => state.selectBlock);
  const addBlock = useEditorStore((state) => state.addBlock);
  const moveBlock = useEditorStore((state) => state.moveBlock);
  const canvasElementRefs = useRef(new Map<string, HTMLElement>());
  const [paletteDropTarget, setPaletteDropTarget] = useState<{
    active: boolean;
    beforeBlockId?: string;
  } | null>(null);
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
    if (readOnly) {
      return;
    }

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

  function registerCanvasElement(blockId: string, element: HTMLElement | null) {
    if (!element) {
      canvasElementRefs.current.delete(blockId);
      return;
    }

    canvasElementRefs.current.set(blockId, element);
  }

  function handlePaletteDragOver(event: DragEvent<HTMLDivElement>) {
    if (readOnly || !hasPaletteBlockDrag(event.dataTransfer)) {
      return;
    }

    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    const beforeBlockId = getDropBeforeBlockId(event.clientY);
    setPaletteDropTarget((current) => {
      if (current?.active && current.beforeBlockId === beforeBlockId) {
        return current;
      }

      return {
        active: true,
        beforeBlockId
      };
    });
  }

  function getDropBeforeBlockId(dropClientY: number) {
    for (const block of survey.blocks) {
      const element = canvasElementRefs.current.get(block.id);

      if (!element) {
        continue;
      }

      const rect = element.getBoundingClientRect();
      const midpointY = rect.top + rect.height / 2;

      if (dropClientY < midpointY) {
        return block.id;
      }
    }

    return undefined;
  }

  function handlePaletteDrop(event: DragEvent<HTMLDivElement>) {
    if (readOnly) {
      return;
    }

    const blockType = event.dataTransfer.getData(PALETTE_BLOCK_DRAG_TYPE);

    if (!isPaletteBlockType(blockType)) {
      setPaletteDropTarget(null);
      return;
    }

    event.preventDefault();
    addBlock({
      type: blockType,
      beforeBlockId: getDropBeforeBlockId(event.clientY)
    });
    setPaletteDropTarget(null);
  }

  function handlePaletteDragLeave(event: DragEvent<HTMLDivElement>) {
    if (
      event.relatedTarget instanceof Node &&
      event.currentTarget.contains(event.relatedTarget)
    ) {
      return;
    }

    setPaletteDropTarget(null);
  }

  useEffect(() => {
    if (!selectedBlockId) {
      return;
    }

    canvasElementRefs.current.get(selectedBlockId)?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest'
    });
  }, [selectedBlockId, survey.blocks.length]);

  return (
    <main className="editor-canvas-stage" onClick={() => {
      if (!readOnly) {
        selectBlock('');
      }
    }}>
      <div
        className="editor-preview-frame"
        data-preview-mode={previewMode}
        data-testid="preview-frame"
        onDragLeave={handlePaletteDragLeave}
        onDragOver={handlePaletteDragOver}
        onDrop={handlePaletteDrop}
        onClick={(e) => e.stopPropagation()}
      >
        {survey.blocks.length ? (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={survey.blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              <div className="editor-canvas-list" data-testid="editor-canvas-list">
                {survey.blocks.map((block) => (
                  <Fragment key={block.id}>
                    {paletteDropTarget?.active && paletteDropTarget.beforeBlockId === block.id ? (
                      <CanvasDropIndicator />
                    ) : null}
                    <SortableCanvasBlockCard
                      block={block}
                      onSelect={selectBlock}
                      readOnly={readOnly}
                      registerCanvasElement={registerCanvasElement}
                      selectedBlockId={selectedBlockId}
                    />
                  </Fragment>
                ))}
                {paletteDropTarget?.active && !paletteDropTarget.beforeBlockId ? (
                  <CanvasDropIndicator />
                ) : null}
              </div>
            </SortableContext>
          </DndContext>
        ) : (
          <div className="editor-canvas-list" data-testid="editor-canvas-list">
            {paletteDropTarget?.active ? <CanvasDropIndicator /> : null}
            <EmptyCanvasState />
          </div>
        )}
      </div>
    </main>
  );
}
