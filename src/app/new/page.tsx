import { redirect } from 'next/navigation';
import { saveSurveyDraft } from '@/features/persistence/repository';
import { createSurveyFromTemplate } from '@/features/survey-schema/templates';

function createSurveyId() {
  return `wj-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export default async function NewSurveyPage({
  searchParams
}: {
  searchParams?: Promise<{ template?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? undefined;
  const surveyId = createSurveyId();
  const document = createSurveyFromTemplate({
    id: surveyId,
    template: resolvedSearchParams?.template
  });

  await saveSurveyDraft({
    surveyId,
    version: document.meta.version,
    document
  });

  redirect(`/editor/${surveyId}`);
}
