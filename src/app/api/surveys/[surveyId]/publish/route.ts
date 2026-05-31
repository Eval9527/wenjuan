import { createDatabaseUnavailableResponse, isDatabaseUnavailableError } from '@/features/persistence/errors';
import { publishSurveyDraft } from '@/features/persistence/repository';

export async function POST(_: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;

  try {
    const published = await publishSurveyDraft(surveyId);
    return Response.json(published);
  } catch (error) {
    if (error instanceof Error && error.message === 'Survey draft not found') {
      return Response.json({ error: 'Survey draft not found' }, { status: 404 });
    }

    if (isDatabaseUnavailableError(error)) {
      return createDatabaseUnavailableResponse();
    }

    throw error;
  }
}
