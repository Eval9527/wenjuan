'use client';

import { useEditorStore } from './editor-store-context';

export function InspectorPanel() {
  const selectedBlock = useEditorStore((state) =>
    state.survey.blocks.find((block) => block.id === state.selectedBlockId) ?? null
  );

  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>Inspector</h3>
      {selectedBlock ? (
        <>
          <div>当前题目：{selectedBlock.label}</div>
          <div>类型：{selectedBlock.type}</div>
        </>
      ) : (
        <p style={{ margin: 0, color: '#667085' }}>选中一个题目后，可在这里查看并编辑属性。</p>
      )}
    </section>
  );
}
