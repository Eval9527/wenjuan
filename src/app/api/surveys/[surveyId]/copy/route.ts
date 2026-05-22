import { demoQuotaResponse, getDemoRequestContext, jsonWithDemoContext } from '@/features/demo-mode/http';
import { assertSurveyCreateQuota, recordSurveyCreateUsage } from '@/features/demo-mode/quota';
import { duplicateSurvey } from '@/features/persistence/repository';

export async function POST(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const demoContext = await getDemoRequestContext(request);

  try {
    if (demoContext) {
      await assertSurveyCreateQuota({
        store: demoContext.store,
        visitorId: demoContext.visitorId
      });
    }

    const duplicated = await duplicateSurvey(surveyId);

    if (demoContext) {
      await recordSurveyCreateUsage({
        store: demoContext.store,
        visitorId: demoContext.visitorId,
        ipHash: demoContext.ipHash,
        surveyId: duplicated.surveyId
      });
    }

    return jsonWithDemoContext(
      { surveyId: duplicated.surveyId, document: duplicated.document },
      { status: 201 },
      demoContext
    );
  } catch (error) {
    const quotaResponse = demoQuotaResponse(error, demoContext);
    if (quotaResponse) {
      return quotaResponse;
    }

    if (error instanceof Error && error.message === 'Survey draft not found') {
      return jsonWithDemoContext({ error: 'Survey draft not found' }, { status: 404 }, demoContext);
    }

    throw error;
  }
}
