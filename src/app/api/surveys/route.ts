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
  const body = await request.json().catch(() => ({}));
  const surveyId =
    typeof body?.surveyId === 'string' && body.surveyId.trim() ? body.surveyId.trim() : createShortSurveyId();

  const document = createEmptySurvey({ id: surveyId });
  const saved = await saveSurveyDraft({
    surveyId,
    version: document.meta.version,
    document
  });

  return Response.json(saved, { status: 201 });
}
