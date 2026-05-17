import { duplicateSurvey } from '@/features/persistence/repository';

export async function POST(_: Request, { params }: { params: Promise<{ surveyId: string }> }) {
  const { surveyId } = await params;

  try {
    const duplicated = await duplicateSurvey(surveyId);
    return Response.json({ surveyId: duplicated.surveyId, document: duplicated.document }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === 'Survey draft not found') {
      return Response.json({ error: 'Survey draft not found' }, { status: 404 });
    }

    throw error;
  }
}
