import { HomeSurveyActions } from '@/components/home/HomeSurveyActions';
import { listSurveyDrafts } from '@/features/persistence/repository';

export default async function HomePage() {
  const surveys = await listSurveyDrafts();
  const totalSurveys = surveys.length;
  const publishedSurveys = surveys.filter((survey) => Boolean(survey.publishedVersion)).length;
  const totalResponses = surveys.reduce((sum, survey) => sum + survey.responseCount, 0);

  return (
    <main style={{ padding: 32, display: 'flex', flexDirection: 'column', gap: 24 }}>
      <section style={{ display: 'flex', justifyContent: 'space-between', gap: 24, alignItems: 'flex-start' }}>
        <div style={{ maxWidth: 620 }}>
          <h1 style={{ margin: 0 }}>问卷 Demo 工作台</h1>
          <p style={{ margin: '12px 0 0', color: '#667085' }}>
            以 AI-first 编辑器为核心，已经支持问卷创建、编辑、自动保存和填写页访问。
          </p>
        </div>
        <a href="/new">新建问卷</a>
      </section>

      <section
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
          gap: 12
        }}
      >
        {[
          ['问卷总数', totalSurveys],
          ['已发布', publishedSurveys],
          ['累计答卷', totalResponses]
        ].map(([label, value]) => (
          <article
            key={label}
            style={{
              border: '1px solid #d7deea',
              borderRadius: 16,
              padding: 16,
              background: '#fff',
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <span style={{ color: '#667085', fontSize: 14 }}>{label}</span>
            <strong style={{ fontSize: 28, lineHeight: 1 }}>{value}</strong>
          </article>
        ))}
      </section>

      <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <h2 style={{ margin: 0 }}>最近问卷</h2>
        {surveys.length ? (
          <div style={{ display: 'grid', gap: 12 }}>
            {surveys.map((survey) => (
              <article
                key={survey.surveyId}
                style={{
                  border: '1px solid #d7deea',
                  borderRadius: 16,
                  padding: 16,
                  background: '#fff',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  gap: 16
                }}
              >
                <div>
                  <strong>{survey.title}</strong>
                  <p style={{ margin: '6px 0 0', color: '#667085' }}>
                    {survey.surveyId} · 当前版本 v{survey.currentVersion}
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#667085' }}>
                    {survey.publishedVersion ? `已发布 v${survey.publishedVersion}` : '未发布'}
                  </p>
                  <p style={{ margin: '6px 0 0', color: '#667085' }}>已收集 {survey.responseCount} 份答卷</p>
                </div>
                <HomeSurveyActions
                  published={Boolean(survey.publishedVersion)}
                  surveyId={survey.surveyId}
                />
              </article>
            ))}
          </div>
        ) : (
          <div
            style={{
              border: '1px dashed #cbd5e1',
              borderRadius: 16,
              padding: 24,
              background: '#f8fafc'
            }}
          >
            <strong>还没有问卷</strong>
            <p style={{ margin: '8px 0 0', color: '#667085' }}>先创建一个新问卷，再进入 AI-first 编辑器开始生成内容。</p>
          </div>
        )}
      </section>
    </main>
  );
}
