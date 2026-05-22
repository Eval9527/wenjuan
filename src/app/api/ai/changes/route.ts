import { aiDraftChangeSetSchema, type AiDraftChangeSet } from '@/features/ai-assistant/types';
import { buildLocalAiChangeSet, LocalAiError } from '@/features/ai-assistant/local-ai';
import { buildMockChangeSet } from '@/features/ai-assistant/mock-change-set';
import { demoQuotaResponse, getDemoRequestContext, jsonWithDemoContext } from '@/features/demo-mode/http';
import { assertAiQuota, recordAiUsage } from '@/features/demo-mode/quota';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

function buildFallbackChangeSet(prompt: string, currentDocument: SurveyDocument): AiDraftChangeSet {
  return buildMockChangeSet(prompt, currentDocument);
}

async function buildAiChangeSet({
  prompt,
  currentDocument,
  signal
}: {
  prompt: string;
  currentDocument: SurveyDocument;
  signal: AbortSignal;
}) {
  try {
    return (await buildLocalAiChangeSet({ prompt, currentDocument, signal })) ?? buildFallbackChangeSet(prompt, currentDocument);
  } catch (error) {
    if (error instanceof LocalAiError) {
      if (signal.aborted) {
        throw error;
      }

      return buildFallbackChangeSet(prompt, currentDocument);
    }

    throw error;
  }
}

export async function POST(request: Request) {
  const demoContext = await getDemoRequestContext(request);
  const body = await request.json();
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const currentDocument: SurveyDocument = surveyDocumentSchema.parse(body.currentDocument);

  try {
    if (demoContext) {
      await assertAiQuota({ store: demoContext.store, ipHash: demoContext.ipHash });
    }

    const changeSet = await buildAiChangeSet({ prompt, currentDocument, signal: request.signal });

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

    throw error;
  }
}
