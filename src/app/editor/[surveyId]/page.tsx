import { EditorWorkspace } from '@/components/editor/EditorWorkspace';

export default async function EditorPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return <EditorWorkspace surveyId={surveyId} />;
}
