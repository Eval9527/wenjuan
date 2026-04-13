'use client';

import type { AiDraftChangeSet, ChangeOperation } from '@/features/ai-assistant/types';

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

type Props = {
  changeSet: AiDraftChangeSet;
  onApply: () => void;
  onDiscard: () => void;
};

export function AiChangePreview({ changeSet, onApply, onDiscard }: Props) {
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
      <strong>{changeSet.summary}</strong>
      <div style={{ color: '#667085' }}>建议操作数：{changeSet.operations.length}</div>
      <ul style={{ margin: 0, paddingLeft: 18 }}>
        {changeSet.operations.map((operation, index) => (
          <li key={`${operation.type}-${index}`}>{describeOperation(operation)}</li>
        ))}
      </ul>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onApply} type="button">
          Apply
        </button>
        <button onClick={onDiscard} type="button">
          Discard
        </button>
      </div>
    </section>
  );
}
