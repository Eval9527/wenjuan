import { redirect } from 'next/navigation';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { saveSurveyDraft } from '@/features/persistence/repository';

export default async function NewSurveyPage() {
  const surveyId = `survey-${crypto.randomUUID()}`;
  const document = createEmptySurvey({ id: surveyId });

  await saveSurveyDraft({
    surveyId,
    version: document.meta.version,
    document
  });

  redirect(`/editor/${surveyId}`);
}
