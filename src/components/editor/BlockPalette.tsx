'use client';

import {
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  DndContext,
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
import { resolveDragMove, restrictToVerticalTranslate } from '@/features/editor-core/drag-sort';
import type { SurveyBlock, SurveyBlockType } from '@/features/survey-schema/schema';
import { PALETTE_BLOCK_DRAG_TYPE } from './editor-dnd';
import { useEditorStore } from './editor-store-context';
import { useEffect, useRef, useState } from 'react';

const groups: Array<{
  title: string;
  items: Array<{ label: string; hint: string; type: SurveyBlockType; icon: string }>;
}> = [
  {
    title: '文本显示',
    items: [
      { label: '标题', hint: '添加一个 H1/H2/H3 标题块', type: 'title', icon: 'H1' },
      { label: '段落', hint: '添加一段可多行输入的说明文字', type: 'paragraph', icon: 'P' }
    ]
  },
  {
    title: '用户输入',
    items: [{ label: '填写框', hint: '允许用户输入一行文字', type: 'input', icon: 'T' }]
  },
  {
    title: '用户选择',
    items: [
      { label: '单选', hint: '在多个选项中选择一个', type: 'singleChoice', icon: '◉' },
      { label: '多选', hint: '在多个选项中选择多个', type: 'multiChoice', icon: '☑' }
    ]
  }
];

function getBlockTypeName(type: SurveyBlockType) {
  switch (type) {
    case 'title':
      return '标题';
    case 'paragraph':
      return '段落';
    case 'input':
      return '输入';
    case 'singleChoice':
      return '单选';
    case 'multiChoice':
      return '多选';
    default:
      return type;
  }
}

function getBlockDisplayLabel(block: SurveyBlock) {
  if (block.type === 'paragraph') {
    return block.content.split(/\n/).find((line) => line.trim())?.trim() ?? '段落';
  }

  return block.label;
}

function SortableOutlineItem({
  block,
  index,
  selectedBlockId,
  onSelect,
  readOnly,
  registerOutlineElement
}: {
  block: SurveyBlock;
  index: number;
  selectedBlockId: string | null;
  onSelect: (blockId: string) => void;
  readOnly: boolean;
  registerOutlineElement: (blockId: string, element: HTMLElement | null) => void;
}) {
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

  function setOutlineNode(node: HTMLDivElement | null) {
    setNodeRef(node);
    registerOutlineElement(block.id, node);
  }

  return (
    <div
      data-testid="outline-block-row"
      ref={setOutlineNode}
      className={[
        'editor-outline-row',
        isSelected ? 'editor-outline-row--active' : '',
        isDragging ? 'editor-outline-row--dragging' : ''
      ].join(' ')}
      style={{
        opacity: isDragging ? 0.72 : 1,
        transform: CSS.Translate.toString(restrictToVerticalTranslate(transform)),
        transition,
        zIndex: isDragging ? 10 : 1,
        position: 'relative'
      }}
    >
      <button
        aria-label={`拖拽排序 ${displayLabel}`}
        className="editor-outline-handle"
        disabled={readOnly}
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
      >
        <span aria-hidden="true" className="editor-handle-dots">
          <span />
          <span />
          <span />
          <span />
          <span />
          <span />
        </span>
      </button>
      <button className="editor-outline-main" onClick={() => onSelect(block.id)} type="button">
        <span className="w-5 text-xs text-[#94a3b8] shrink-0">{index + 1}.</span>
        <span className="flex-1 text-left truncate">{displayLabel}</span>
        <span className="text-[11px] bg-white border border-[#e2e8f0] px-1.5 py-0.5 rounded text-[#64748b] shrink-0">
          {getBlockTypeName(block.type)}
        </span>
      </button>
    </div>
  );
}

export function BlockPalette({ readOnly = false }: { readOnly?: boolean }) {
  const addBlock = useEditorStore((state) => state.addBlock);
  const blocks = useEditorStore((state) => state.survey.blocks);
  const selectedBlockId = useEditorStore((state) => state.selectedBlockId);
  const selectBlock = useEditorStore((state) => state.selectBlock);
  const moveBlock = useEditorStore((state) => state.moveBlock);
  const [activeTab, setActiveTab] = useState<'components' | 'layers'>('components');
  const outlineElementRefs = useRef(new Map<string, HTMLElement>());

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    const blockIds = blocks.map((b) => b.id);
    const resolution = resolveDragMove(blockIds, String(active.id), over ? String(over.id) : null);
    if (resolution.shouldMove && !readOnly) {
      moveBlock(String(active.id), resolution.targetBlockId);
    }
  }

  function registerOutlineElement(blockId: string, element: HTMLElement | null) {
    if (!element) {
      outlineElementRefs.current.delete(blockId);
      return;
    }

    outlineElementRefs.current.set(blockId, element);
  }

  useEffect(() => {
    if (activeTab !== 'layers' || !selectedBlockId) {
      return;
    }

    outlineElementRefs.current.get(selectedBlockId)?.scrollIntoView?.({
      block: 'nearest',
      inline: 'nearest'
    });
  }, [activeTab, blocks.length, selectedBlockId]);

  return (
    <aside className="editor-side-panel editor-side-panel--left">
      <div aria-label="左侧面板切换" className="editor-side-tabs" role="tablist">
        <button
          className={['editor-side-tab', activeTab === 'components' ? 'editor-side-tab--active' : ''].join(' ')}
          onClick={() => setActiveTab('components')}
          type="button"
        >
          组件库
        </button>
        <button
          className={['editor-side-tab', activeTab === 'layers' ? 'editor-side-tab--active' : ''].join(' ')}
          onClick={() => setActiveTab('layers')}
          type="button"
        >
          大纲视图
        </button>
      </div>

      <div className="editor-side-scroll flex-1 p-4">
        {activeTab === 'components' ? (
          <div className="flex flex-col gap-6">
            <div className="space-y-1">
              <h2 className="m-0 text-[18px] font-[800] leading-6 text-[#0f172a]">添加题目</h2>
              <p className="m-0 text-xs leading-5 text-[#64748b]">选择组件后会插入到中间问卷画布。</p>
            </div>
            {readOnly && (
              <div className="rounded-lg bg-[#fff7ed] px-3 py-2 text-sm text-[#b54708]">
                问卷已锁定，无法添加组件。
              </div>
            )}

            {groups.map((group) => (
              <section className="editor-palette-group" key={group.title}>
                <h3 className="mb-3 text-[13px] font-bold text-[#64748b]">{group.title}</h3>
                <div className="grid gap-2">
                  {group.items.map((item) => (
                    <button
                      aria-label={item.label}
                      className="editor-palette-item"
                      disabled={readOnly}
                      draggable={!readOnly}
                      key={item.type}
                      onClick={() => addBlock({ type: item.type })}
                      onDragStart={(event) => {
                        if (readOnly) {
                          return;
                        }

                        event.dataTransfer.effectAllowed = 'copy';
                        event.dataTransfer.setData(PALETTE_BLOCK_DRAG_TYPE, item.type);
                      }}
                      type="button"
                    >
                      <span className="editor-palette-icon" aria-hidden="true">{item.icon}</span>
                      <span className="flex flex-col min-w-0">
                        <span className="text-[14px] font-semibold text-[#1e293b] truncate">{item.label}</span>
                      </span>
                    </button>
                  ))}
                </div>
              </section>
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <h2 className="m-0 text-[18px] font-[800] leading-6 text-[#0f172a] mb-2">问卷大纲</h2>
            {blocks.length === 0 ? (
              <div className="text-sm text-[#94a3b8] text-center py-4">空空如也，快去添加组件吧</div>
            ) : (
              <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd} sensors={sensors}>
                <SortableContext items={blocks.map((b) => b.id)} strategy={verticalListSortingStrategy}>
                  {blocks.map((block, index) => (
                    <SortableOutlineItem
                      key={block.id}
                      block={block}
                      index={index}
                      selectedBlockId={selectedBlockId}
                      onSelect={selectBlock}
                      readOnly={readOnly}
                      registerOutlineElement={registerOutlineElement}
                    />
                  ))}
                </SortableContext>
              </DndContext>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
