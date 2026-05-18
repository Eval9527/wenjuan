import { redirect } from 'next/navigation';
import { saveSurveyDraft } from '@/features/persistence/repository';
import { createSurveyFromTemplate } from '@/features/survey-schema/templates';

function createSurveyId() {
  return `wj-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export default async function NewSurveyPage({
  searchParams
}: {
  searchParams?: Promise<{ template?: string; prompt?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? undefined;
  const surveyId = createSurveyId();
  const prompt = typeof resolvedSearchParams?.prompt === 'string' ? resolvedSearchParams.prompt.trim() : '';
  const template = typeof resolvedSearchParams?.template === 'string' ? resolvedSearchParams.template.trim() : undefined;
  const document = createSurveyFromTemplate({
    id: surveyId,
    template: prompt ? undefined : template
  });

  await saveSurveyDraft({
    surveyId,
    version: document.meta.version,
    document
  });

  if (prompt) {
    return redirect(`/editor/${surveyId}?aiPrompt=${encodeURIComponent(prompt)}`);
  }

  if (template) {
    return redirect(`/editor/${surveyId}?template=${encodeURIComponent(template)}`);
  }

  return redirect(`/editor/${surveyId}`);
}
