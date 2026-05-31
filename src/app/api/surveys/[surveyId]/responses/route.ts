import { getDemoModeConfig } from '@/features/demo-mode/config';
import {
  demoQuotaResponse,
  getDemoRequestContext,
  jsonWithDemoContext,
  type DemoRequestContext
} from '@/features/demo-mode/http';
import { assertSubmitQuota, recordSubmitUsage } from '@/features/demo-mode/quota';
import { createDatabaseUnavailableResponse, isDatabaseUnavailableError } from '@/features/persistence/errors';
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

  try {
    const published = await getPublishedSurvey(surveyId);

    if (!published) {
      return Response.json({ error: 'Published survey not found' }, { status: 404 });
    }

    const responses = await listSurveyResponses(surveyId);

    return Response.json({
      responseCount: responses.length,
      responses: responses.slice(0, getLimit(request))
    });
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return createDatabaseUnavailableResponse();
    }

    throw error;
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  let demoContext: DemoRequestContext | null = null;

  try {
    demoContext = await getDemoRequestContext(request);
    const body = await request.json();

    if (demoContext) {
      await assertSubmitQuota({
        store: demoContext.store,
        visitorId: demoContext.visitorId,
        ipHash: demoContext.ipHash,
        surveyId
      });

      const existingResponses = await listSurveyResponses(surveyId);
      if (existingResponses.length >= getDemoModeConfig().maxResponsesPerSurvey) {
        return jsonWithDemoContext(
          { error: '当前问卷已达到演示站答卷上限。', code: 'SURVEY_RESPONSE_LIMIT' },
          { status: 429 },
          demoContext
        );
      }
    }

    const response = await submitSurveyResponse(surveyId, body.answers ?? {});
    const responses = await listSurveyResponses(surveyId);

    if (demoContext) {
      await recordSubmitUsage({
        store: demoContext.store,
        visitorId: demoContext.visitorId,
        ipHash: demoContext.ipHash,
        surveyId
      });
    }

    return jsonWithDemoContext({
      responseId: response.id,
      responseCount: responses.length,
      submittedAt: response.submittedAt
    }, undefined, demoContext);
  } catch (error) {
    const quotaResponse = demoQuotaResponse(error, demoContext);
    if (quotaResponse) {
      return quotaResponse;
    }

    if (error instanceof Error && error.message === 'Published survey not found') {
      return jsonWithDemoContext({ error: 'Published survey not found' }, { status: 404 }, demoContext);
    }

    if (isDatabaseUnavailableError(error)) {
      return createDatabaseUnavailableResponse();
    }

    throw error;
  }
}
