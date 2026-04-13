import { listSurveyResponses, submitSurveyResponse } from '@/features/persistence/repository';

export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const body = await request.json();

  try {
    const response = await submitSurveyResponse(surveyId, body.answers ?? {});
    const responses = await listSurveyResponses(surveyId);
    return Response.json({
      responseId: response.id,
      responseCount: responses.length,
      submittedAt: response.submittedAt
    });
  } catch (error) {
    if (error instanceof Error && error.message === 'Published survey not found') {
      return Response.json({ error: 'Published survey not found' }, { status: 404 });
    }

    throw error;
  }
}
