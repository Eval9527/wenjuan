'use client';

import { useEditorStore } from './editor-store-context';

export function InspectorPanel() {
  const selectedBlock = useEditorStore((state) =>
    state.survey.blocks.find((block) => block.id === state.selectedBlockId) ?? null
  );
  const updateBlock = useEditorStore((state) => state.updateBlock);

  if (!selectedBlock) {
    return (
      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h3 style={{ margin: 0 }}>Inspector</h3>
        <p style={{ margin: 0, color: '#667085' }}>选中一个题目后，可在这里查看并编辑属性。</p>
      </section>
    );
  }

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Inspector</h3>
      <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span>题目标题</span>
        <input
          aria-label="题目标题"
          onChange={(event) => updateBlock(selectedBlock.id, { label: event.target.value })}
          type="text"
          value={selectedBlock.label}
        />
      </label>
      <div>类型：{selectedBlock.type}</div>
    </section>
  );
}
