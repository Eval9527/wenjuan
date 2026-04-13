import { surveyDocumentSchema } from '@/features/survey-schema/schema';
import { getLatestSurveyDraft, saveSurveyDraft } from '@/features/persistence/repository';

export async function GET(_: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const latestDraft = await getLatestSurveyDraft(surveyId);

  if (!latestDraft) {
    return Response.json({ error: 'Survey draft not found' }, { status: 404 });
  }

  return Response.json(latestDraft);
}

export async function PUT(request: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;
  const body = await request.json();
  const document = surveyDocumentSchema.parse(body.document);
  const saved = await saveSurveyDraft({
    surveyId,
    version: document.meta.version,
    document
  });

  return Response.json(saved);
}
