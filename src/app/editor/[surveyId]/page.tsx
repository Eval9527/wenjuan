export default async function EditorPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return (
    <main style={{ padding: 32 }}>
      <h1>编辑器</h1>
      <p>当前问卷：{surveyId}</p>
    </main>
  );
}
