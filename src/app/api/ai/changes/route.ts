import { aiDraftChangeSetSchema } from '@/features/ai-assistant/types';
import { buildLocalAiChangeSet, LocalAiError } from '@/features/ai-assistant/local-ai';
import { buildMockChangeSet } from '@/features/ai-assistant/mock-change-set';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const currentDocument: SurveyDocument = surveyDocumentSchema.parse(body.currentDocument);

  try {
    const localAiChangeSet = await buildLocalAiChangeSet({ prompt, currentDocument, signal: request.signal });
    const changeSet = localAiChangeSet ?? buildMockChangeSet(prompt, currentDocument);

    return Response.json(aiDraftChangeSetSchema.parse(changeSet));
  } catch (error) {
    if (error instanceof LocalAiError) {
      return Response.json(
        { error: 'AI 暂时没能生成修改建议，请稍后重试或换个说法。' },
        { status: 502 }
      );
    }

    throw error;
  }
}
