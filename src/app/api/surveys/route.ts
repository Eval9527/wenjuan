import { demoQuotaResponse, getDemoRequestContext, jsonWithDemoContext } from '@/features/demo-mode/http';
import { assertSurveyCreateQuota, recordSurveyCreateUsage } from '@/features/demo-mode/quota';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { listSurveyDrafts, saveSurveyDraft } from '@/features/persistence/repository';

function createShortSurveyId() {
  return `wj-${crypto.randomUUID().replace(/-/g, '').slice(0, 8)}`;
}

export async function GET() {
  return Response.json({
    surveys: await listSurveyDrafts()
  });
}

export async function POST(request: Request) {
  const demoContext = await getDemoRequestContext(request);
  const body = await request.json().catch(() => ({}));
  const surveyId =
    typeof body?.surveyId === 'string' && body.surveyId.trim() ? body.surveyId.trim() : createShortSurveyId();

  try {
    if (demoContext) {
      await assertSurveyCreateQuota({
        store: demoContext.store,
        visitorId: demoContext.visitorId
      });
    }

    const document = createEmptySurvey({ id: surveyId });
    const saved = await saveSurveyDraft({
      surveyId,
      version: document.meta.version,
      document
    });

    if (demoContext) {
      await recordSurveyCreateUsage({
        store: demoContext.store,
        visitorId: demoContext.visitorId,
        ipHash: demoContext.ipHash,
        surveyId
      });
    }

    return jsonWithDemoContext(saved, { status: 201 }, demoContext);
  } catch (error) {
    const quotaResponse = demoQuotaResponse(error, demoContext);
    if (quotaResponse) {
      return quotaResponse;
    }

    throw error;
  }
}
