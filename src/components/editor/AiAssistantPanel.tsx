'use client';

export function AiAssistantPanel() {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <h3 style={{ margin: 0 }}>AI Assistant</h3>
      <p style={{ margin: 0, color: '#667085' }}>描述你想生成或修改的问卷内容，后续这里会接入变更预览与 Apply 流程。</p>
      <textarea aria-label="AI prompt" placeholder="例如：生成一个用户满意度问卷" rows={8} />
      <button type="button">生成修改建议</button>
    </section>
  );
}
