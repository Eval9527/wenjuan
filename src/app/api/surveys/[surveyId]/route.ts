import { surveyDocumentSchema } from '@/features/survey-schema/schema';
import { createDatabaseUnavailableResponse, isDatabaseUnavailableError } from '@/features/persistence/errors';
import { getLatestSurveyDraft, getPublishedSurvey, listSurveyResponses, saveSurveyDraft } from '@/features/persistence/repository';

export async function GET(_: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;

  try {
    const latestDraft = await getLatestSurveyDraft(surveyId);

    if (!latestDraft) {
      return Response.json({ error: 'Survey draft not found' }, { status: 404 });
    }

    const published = await getPublishedSurvey(surveyId);
    const responses = await listSurveyResponses(surveyId);

    return Response.json({
      ...latestDraft,
      responseCount: responses.length,
      published: published
        ? {
            version: published.version,
            publishedAt: published.publishedAt,
            document: published.document
          }
        : null
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return createDatabaseUnavailableResponse();
    }

    throw error;
  }
}

export async function PUT(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;

  try {
    const published = await getPublishedSurvey(surveyId);

    if (published) {
      return Response.json({ error: 'Published survey is read only. Duplicate it before editing.' }, { status: 409 });
    }

    const body = await request.json();
    const document = surveyDocumentSchema.parse(body.document);
    const saved = await saveSurveyDraft({
      surveyId,
      version: document.meta.version,
      document
    });

    return Response.json(saved);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return createDatabaseUnavailableResponse();
    }

    throw error;
  }
}
