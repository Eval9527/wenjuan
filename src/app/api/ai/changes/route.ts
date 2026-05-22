import { aiDraftChangeSetSchema } from '@/features/ai-assistant/types';
import { buildLocalAiChangeSet, LocalAiError } from '@/features/ai-assistant/local-ai';
import { buildMockChangeSet } from '@/features/ai-assistant/mock-change-set';
import { demoQuotaResponse, getDemoRequestContext, jsonWithDemoContext } from '@/features/demo-mode/http';
import { assertAiQuota, recordAiUsage } from '@/features/demo-mode/quota';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

export async function POST(request: Request) {
  const demoContext = await getDemoRequestContext(request);
  const body = await request.json();
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const currentDocument: SurveyDocument = surveyDocumentSchema.parse(body.currentDocument);

  try {
    if (demoContext) {
      await assertAiQuota({ store: demoContext.store, ipHash: demoContext.ipHash });
    }

    const localAiChangeSet = await buildLocalAiChangeSet({ prompt, currentDocument, signal: request.signal });
    const changeSet = localAiChangeSet ?? buildMockChangeSet(prompt, currentDocument);

    if (demoContext) {
      await recordAiUsage({
        store: demoContext.store,
        visitorId: demoContext.visitorId,
        ipHash: demoContext.ipHash
      });
    }

    return jsonWithDemoContext(aiDraftChangeSetSchema.parse(changeSet), undefined, demoContext);
  } catch (error) {
    const quotaResponse = demoQuotaResponse(error, demoContext);
    if (quotaResponse) {
      return quotaResponse;
    }

    if (error instanceof LocalAiError) {
      return jsonWithDemoContext(
        { error: 'AI 暂时没能生成修改建议，请稍后重试或换个说法。' },
        { status: 502 },
        demoContext
      );
    }

    throw error;
  }
}
