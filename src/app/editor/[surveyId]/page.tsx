import type { Metadata } from 'next';
import { EditorWorkspace } from '@/components/editor/EditorWorkspace';
import { getLatestSurveyDraft } from '@/features/persistence/repository';


export async function generateMetadata({
  params
}: {
  params: Promise<{ surveyId: string }>;
}): Promise<Metadata> {
  const { surveyId } = await params;
  const draft = await getLatestSurveyDraft(surveyId);
  const title = draft?.document.title ? `编辑问卷：${draft.document.title}` : '编辑问卷';

  return {
    title,
    description: '在 Wenjuan 编辑器中通过 AI 助手、题型组件和实时预览完善问卷草稿。',
    robots: { index: false, follow: false }
  };
}

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
