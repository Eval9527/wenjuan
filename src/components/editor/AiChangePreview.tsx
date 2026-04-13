'use client';

import type { AiDraftChangeSet } from '@/features/ai-assistant/types';

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
