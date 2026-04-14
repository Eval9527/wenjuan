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
          padding: 24
        }}
      >
        <div style={{ maxWidth: 420, textAlign: 'center' }}>
          <strong>问卷尚未发布</strong>
          <p style={{ margin: '8px 0 0', color: '#667085' }}>请先返回编辑器点击“发布问卷”，再打开填写页进行演示。</p>
          <div style={{ display: 'flex', justifyContent: 'center', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
            <a href={`/editor/${surveyId}`}>返回编辑器</a>
            <a href="/">返回工作台</a>
          </div>
        </div>
      </main>
    );
  }

  return <PublishedSurveyPage document={publishedSurvey.document} surveyId={surveyId} />;
}
