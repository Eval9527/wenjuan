import { listSurveyDrafts } from '@/features/persistence/repository';

export default async function HomePage() {
  const surveys = await listSurveyDrafts();

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
                </div>
                <div style={{ display: 'flex', gap: 12 }}>
                  <a href={`/editor/${survey.surveyId}`}>继续编辑</a>
                  <a href={`/f/${survey.surveyId}`}>填写页面</a>
                </div>
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
