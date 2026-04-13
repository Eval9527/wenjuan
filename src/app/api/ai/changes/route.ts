import { aiDraftChangeSetSchema } from '@/features/ai-assistant/types';
import { buildMockChangeSet } from '@/features/ai-assistant/mock-change-set';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const currentDocument: SurveyDocument = surveyDocumentSchema.parse(body.currentDocument);
  const changeSet = buildMockChangeSet(prompt, currentDocument);

  return Response.json(aiDraftChangeSetSchema.parse(changeSet));
}
