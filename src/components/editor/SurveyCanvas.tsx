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
    <div className="mx-auto flex max-w-[440px] flex-col items-center gap-4 py-16 text-center">
      <span className="ui-kicker">画布预览</span>
      <h2 className="m-0 text-[28px] font-[800] leading-[1.2] tracking-[-0.03em] text-[#101828]">先用 AI 说一句，或者从左侧加一个基础题型。</h2>
      <p className="m-0 text-sm leading-7 text-[#667085]">这里展示的应该尽量接近发布后的问卷观感，所以排序、删除等编辑操作已经被移到顶部工具栏。</p>
    </div>
  );
}

function SortableCanvasBlockCard({
  block,
  index,
  selectedBlockId,
  onSelect,
  readOnly
}: {
  block: SurveyBlock;
  index: number;
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  readOnly: boolean;
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

  return (
    <article
      aria-selected={isSelected}
      className={[
        'group relative rounded-[26px] p-2 transition',
        isSelected ? 'bg-[#eff6ff] ring-2 ring-[#2563eb] ring-offset-2 ring-offset-[#eef2f6]' : 'bg-transparent hover:bg-[#f8fafc]'
      ].join(' ')}
      data-testid="canvas-block-card"
      onClick={() => onSelect(block.id)}
      ref={setNodeRef}
      style={{
        cursor: isDragging ? 'grabbing' : 'pointer',
        opacity: isDragging ? 0.72 : 1,
        transform: CSS.Transform.toString(transform),
        transition
      }}
    >
      <button
        aria-label={`拖拽排序 ${block.label}`}
        className={[
          'absolute left-0 top-8 z-10 -translate-x-1/2 rounded-full border border-[#d7dee8] bg-white px-3 py-2 text-xs font-semibold text-[#667085] shadow-sm transition',
          isSelected || readOnly ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
        ].join(' ')}
        disabled={readOnly}
        onClick={(event) => event.stopPropagation()}
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
      >
        ⋮⋮
      </button>

      <div className="pointer-events-none absolute right-6 top-4 rounded-full bg-white/90 px-3 py-1 text-xs font-semibold text-[#667085] shadow-sm">
        {block.type === 'title' ? '标题模块' : `第 ${index + 1} 题`}
      </div>

      <Renderer block={block} mode="editor-preview" />
    </article>
  );
}

export function SurveyCanvas({ readOnly = false }: { readOnly?: boolean }) {
  const survey = useEditorStore((state) => state.survey);
  const previewMode = useEditorStore((state) => state.previewMode);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const selectBlock = useEditorStore((state) => state.selectBlock);
  const moveBlock = useEditorStore((state) => state.moveBlock);
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

  return (
    <section className="flex justify-center bg-[#eef2f6] px-4 py-5 md:px-6">
      <div
        className={[
          'ui-surface flex min-h-[720px] w-full flex-col gap-5 p-4 md:p-6',
          previewMode === 'mobile' ? 'max-w-[430px]' : 'max-w-[920px]'
        ].join(' ')}
        data-preview-mode={previewMode}
        data-testid="preview-frame"
      >
        <div className="flex flex-col gap-3 rounded-[20px] border border-dashed border-[#d7dee8] bg-[#f8fafc] px-4 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">实时画布</p>
            <strong className="mt-1 block text-[17px] leading-7 text-[#101828]">{previewMode === 'mobile' ? '移动版问卷预览' : '桌面版问卷预览'}</strong>
          </div>
          <p className="m-0 max-w-[440px] text-sm leading-6 text-[#667085]">内容区尽量贴近最终发布效果；排序和删除统一放到顶部，避免把操作按钮塞进问卷内容里。</p>
        </div>

        {survey.blocks.length ? (
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
            <SortableContext items={survey.blocks.map((block) => block.id)} strategy={verticalListSortingStrategy}>
              <div className="flex flex-col gap-4">
                {survey.blocks.map((block, index) => (
                  <SortableCanvasBlockCard
                    block={block}
                    index={index}
                    key={block.id}
                    onSelect={selectBlock}
                    readOnly={readOnly}
                    selectedBlockId={selectedBlockId}
                  />
                ))}
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
