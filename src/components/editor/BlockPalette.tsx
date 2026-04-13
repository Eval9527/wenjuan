'use client';

import type { SurveyBlockType } from '@/features/survey-schema/schema';
import { useEditorStore } from './editor-store-context';

const items: Array<{ label: string; type: SurveyBlockType }> = [
  { label: '标题', type: 'title' },
  { label: '填写框', type: 'input' },
  { label: '单选', type: 'singleChoice' },
  { label: '多选', type: 'multiChoice' }
];

export function BlockPalette() {
  const addBlock = useEditorStore((state) => state.addBlock);

  return (
    <aside
      style={{
        borderRight: '1px solid #d7deea',
        background: '#fff',
        padding: 20,
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      <h2 style={{ margin: 0 }}>题型</h2>
      {items.map((item) => (
        <button key={item.type} onClick={() => addBlock({ type: item.type })} type="button">
          {item.label}
        </button>
      ))}
    </aside>
  );
}
