import { aiDraftChangeSetSchema } from '@/features/ai-assistant/types';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

function createId(prefix: string) {
  return `${prefix}-${crypto.randomUUID()}`;
}

function buildMockChangeSet(prompt: string, currentDocument: SurveyDocument) {
  const title = prompt.includes('满意') ? '满意度调查' : 'AI 生成问卷';
  const nextDocument: SurveyDocument = {
    ...currentDocument,
    title,
    blocks: [
      {
        id: createId('block'),
        type: 'title',
        label: title,
        level: 1
      },
      {
        id: createId('block'),
        type: 'singleChoice',
        label: '你对产品满意吗？',
        options: [
          { id: createId('option'), text: '满意' },
          { id: createId('option'), text: '一般' }
        ]
      }
    ],
    meta: {
      ...currentDocument.meta,
      version: currentDocument.meta.version + 1,
      updatedAt: new Date().toISOString()
    }
  };

  return {
    id: createId('change'),
    basedOnVersion: currentDocument.meta.version,
    userIntent: prompt,
    summary: `新增 ${nextDocument.blocks.length} 个题目`,
    operations: nextDocument.blocks.map((block) => ({
      type: 'addBlock' as const,
      block
    })),
    nextDocument
  };
}

export async function POST(request: Request) {
  const body = await request.json();
  const prompt = typeof body.prompt === 'string' ? body.prompt : '';
  const currentDocument = surveyDocumentSchema.parse(body.currentDocument);
  const changeSet = buildMockChangeSet(prompt, currentDocument);

  return Response.json(aiDraftChangeSetSchema.parse(changeSet));
}
