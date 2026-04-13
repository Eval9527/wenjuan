'use client';

import { SurveyRenderer } from '@/features/renderer/SurveyRenderer';
import type { AiDraftChangeSet, ChangeOperation } from '@/features/ai-assistant/types';
import type { ChoiceOption, SurveyBlock, SurveyDocument } from '@/features/survey-schema/schema';

function describeOperation(operation: ChangeOperation) {
  switch (operation.type) {
    case 'addBlock':
      return `${operation.type} · ${operation.block.type}`;
    case 'removeBlock':
      return `${operation.type} · ${operation.blockId}`;
    case 'moveBlock':
      return `${operation.type} · ${operation.blockId}`;
    case 'updateBlock':
      return `${operation.type} · ${operation.blockId}`;
    default:
      return operation satisfies never;
  }
}

function blockTypeLabel(type: SurveyBlock['type']) {
  switch (type) {
    case 'title':
      return '标题';
    case 'input':
      return '填写框';
    case 'singleChoice':
      return '单选';
    case 'multiChoice':
      return '多选';
    default:
      return type satisfies never;
  }
}

function formatBoolean(value: boolean | undefined) {
  return value ? '是' : '否';
}

function formatOptions(options: ChoiceOption[] | undefined) {
  if (!options?.length) {
    return '无';
  }

  return options.map((option) => option.text).join(' / ');
}

function buildUpdateDetails({
  operation,
  currentBlock,
  nextBlock
}: {
  operation: Extract<ChangeOperation, { type: 'updateBlock' }>;
  currentBlock?: SurveyBlock;
  nextBlock?: SurveyBlock;
}) {
  return Object.keys(operation.changes).map((field) => {
    switch (field) {
      case 'label':
        return `题目标题：${currentBlock?.label ?? '-'} → ${nextBlock?.label ?? '-'}`;
      case 'description':
        return `题目描述：${currentBlock?.description ?? '无'} → ${nextBlock?.description ?? '无'}`;
      case 'placeholder':
        return `占位提示：${
          currentBlock && 'placeholder' in currentBlock ? currentBlock.placeholder ?? '无' : '无'
        } → ${nextBlock && 'placeholder' in nextBlock ? nextBlock.placeholder ?? '无' : '无'}`;
      case 'required':
        return `是否必填：${formatBoolean(currentBlock?.required)} → ${formatBoolean(nextBlock?.required)}`;
      case 'level':
        return `标题层级：${
          currentBlock && currentBlock.type === 'title' ? `H${currentBlock.level}` : 'H1'
        } → ${nextBlock && nextBlock.type === 'title' ? `H${nextBlock.level}` : 'H1'}`;
      case 'options':
        return `选项：${
          currentBlock && 'options' in currentBlock ? formatOptions(currentBlock.options) : '无'
        } → ${nextBlock && 'options' in nextBlock ? formatOptions(nextBlock.options) : '无'}`;
      default:
        return `${field}：已更新`;
    }
  });
}

function getOperationPresentation({
  operation,
  currentDocument,
  nextDocument
}: {
  operation: ChangeOperation;
  currentDocument: SurveyDocument;
  nextDocument: SurveyDocument;
}) {
  const currentBlock = 'blockId' in operation
    ? currentDocument.blocks.find((block) => block.id === operation.blockId)
    : undefined;
  const nextBlock = 'blockId' in operation
    ? nextDocument.blocks.find((block) => block.id === operation.blockId)
    : 'block' in operation
      ? nextDocument.blocks.find((block) => block.id === operation.block.id) ?? operation.block
      : undefined;

  switch (operation.type) {
    case 'addBlock':
      return {
        badge: '新增',
        title: `${blockTypeLabel(operation.block.type)} · ${operation.block.label}`,
        details: [
          operation.block.type === 'input' && operation.block.placeholder
            ? `占位提示：${operation.block.placeholder}`
            : null,
          'options' in operation.block ? `选项：${formatOptions(operation.block.options)}` : null
        ].filter(Boolean) as string[]
      };
    case 'removeBlock':
      return {
        badge: '删除',
        title: currentBlock ? `${blockTypeLabel(currentBlock.type)} · ${currentBlock.label}` : `删除题目 · ${operation.blockId}`,
        details: ['该题目将从问卷中移除']
      };
    case 'moveBlock':
      return {
        badge: '排序',
        title: currentBlock ? `${blockTypeLabel(currentBlock.type)} · ${currentBlock.label}` : `重排题目 · ${operation.blockId}`,
        details: [
          nextBlock
            ? `移动到第 ${nextDocument.blocks.findIndex((block) => block.id === nextBlock.id) + 1} 位`
            : '题目顺序已调整'
        ]
      };
    case 'updateBlock':
      return {
        badge: '修改',
        title: currentBlock ? `${blockTypeLabel(currentBlock.type)} · ${currentBlock.label}` : `更新题目 · ${operation.blockId}`,
        details: buildUpdateDetails({ operation, currentBlock, nextBlock })
      };
    default:
      return operation satisfies never;
  }
}

type Props = {
  changeSet: AiDraftChangeSet;
  currentDocument: SurveyDocument;
  onApply: () => void;
  onDiscard: () => void;
};

export function AiChangePreview({ changeSet, currentDocument, onApply, onDiscard }: Props) {
  return (
    <section
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        border: '1px solid #d7deea',
        borderRadius: 16,
        padding: 16,
        background: '#f8fafc'
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <strong>{changeSet.summary}</strong>
        <div style={{ color: '#667085', fontSize: 13 }}>用户意图：{changeSet.userIntent}</div>
        <div style={{ color: '#667085' }}>建议操作数：{changeSet.operations.length}</div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong>变更明细</strong>
        {changeSet.operations.map((operation, index) => {
          const presentation = getOperationPresentation({
            operation,
            currentDocument,
            nextDocument: changeSet.nextDocument
          });

          return (
            <article
              key={`${operation.type}-${index}`}
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                border: '1px solid #d7deea',
                borderRadius: 14,
                padding: 12,
                background: '#fff'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '2px 8px',
                    borderRadius: 999,
                    background: '#e8f0ff',
                    color: '#0f62fe',
                    fontSize: 12,
                    fontWeight: 600
                  }}
                >
                  {presentation.badge}
                </span>
                <strong>{presentation.title}</strong>
              </div>
              <code style={{ fontSize: 12, color: '#475467' }}>{describeOperation(operation)}</code>
              {presentation.details.length ? (
                <ul style={{ margin: 0, paddingLeft: 18, color: '#475467' }}>
                  {presentation.details.map((detail) => (
                    <li key={detail}>{detail}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <strong>建议后的问卷</strong>
        <div
          style={{
            border: '1px solid #d7deea',
            borderRadius: 16,
            padding: 16,
            background: '#fff'
          }}
        >
          <SurveyRenderer document={changeSet.nextDocument} mode="published-desktop" />
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onApply} type="button">
          应用修改
        </button>
        <button onClick={onDiscard} type="button">
          放弃修改
        </button>
      </div>
    </section>
  );
}
