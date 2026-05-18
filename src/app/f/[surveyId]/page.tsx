import { PublishedSurveyPage } from '@/components/published/PublishedSurveyPage';
import { getPublishedSurvey } from '@/features/persistence/repository';

export default async function FillSurveyPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  const publishedSurvey = await getPublishedSurvey(surveyId);

  if (!publishedSurvey) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: 24,
          background: 'var(--page-bg)'
        }}
      >
        <div className="ui-panel" style={{ maxWidth: 420, textAlign: 'center', padding: 24 }}>
          <strong>问卷暂未开放填写</strong>
          <p style={{ margin: '8px 0 0', color: '#667085' }}>请稍后再试，或联系问卷发起人确认填写时间。</p>
        </div>
      </main>
    );
  }

  return <PublishedSurveyPage document={publishedSurvey.document} surveyId={surveyId} />;
}
