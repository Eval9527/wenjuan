import { EditorShell } from '@/components/editor/EditorShell';

export default async function EditorPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;

  return <EditorShell surveyId={surveyId} />;
}
