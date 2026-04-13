import { notFound } from 'next/navigation';
import { PublishedSurveyPage } from '@/components/published/PublishedSurveyPage';
import { getLatestSurveyDraft } from '@/features/persistence/repository';

export default async function FillSurveyPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  const latestDraft = await getLatestSurveyDraft(surveyId);

  if (!latestDraft) {
    notFound();
  }

  return <PublishedSurveyPage document={latestDraft.document} surveyId={surveyId} />;
}
