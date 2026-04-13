import { getPublishedSurvey, listSurveyResponses, submitSurveyResponse } from '@/features/persistence/repository';

function getLimit(request: Request) {
  const url = new URL(request.url);
  const raw = Number(url.searchParams.get('limit') ?? '5');

  if (!Number.isFinite(raw) || raw < 1) {
    return 5;
  }

  return Math.min(Math.floor(raw), 20);
}

export async function GET(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const published = await getPublishedSurvey(surveyId);

  if (!published) {
    return Response.json({ error: 'Published survey not found' }, { status: 404 });
  }

  const responses = await listSurveyResponses(surveyId);

  return Response.json({
    responseCount: responses.length,
    responses: responses.slice(0, getLimit(request))
  });
}

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
