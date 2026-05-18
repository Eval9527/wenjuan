import { EditorWorkspace } from '@/components/editor/EditorWorkspace';

export default async function EditorPage({
  params,
  searchParams
}: {
  params: Promise<{ surveyId: string }>;
  searchParams?: Promise<{ aiPrompt?: string; template?: string }>;
}) {
  const { surveyId } = await params;
  const resolvedSearchParams = (await searchParams) ?? {};
  const initialAiPrompt =
    typeof resolvedSearchParams.aiPrompt === 'string' ? resolvedSearchParams.aiPrompt.trim() : undefined;
  const initialTemplateKey =
    typeof resolvedSearchParams.template === 'string' ? resolvedSearchParams.template.trim() : undefined;

  return (
    <EditorWorkspace
      initialAiPrompt={initialAiPrompt || undefined}
      initialTemplateKey={initialTemplateKey || undefined}
      surveyId={surveyId}
    />
  );
}
