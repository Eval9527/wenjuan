import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import { PublishedSurveyPage } from '@/components/published/PublishedSurveyPage';
import { DatabaseUnavailableNotice } from '@/components/system/DatabaseUnavailableNotice';
import { isDatabaseUnavailableError } from '@/features/persistence/errors';
import { getPublishedSurvey } from '@/features/persistence/repository';
import { getSurveySubmissionCookieName, getSurveySubmissionCookieValue } from '@/features/responses/submission-cookie';


export async function generateMetadata({
  params
}: {
  params: Promise<{ surveyId: string }>;
}): Promise<Metadata> {
  const { surveyId } = await params;
  let publishedSurvey: Awaited<ReturnType<typeof getPublishedSurvey>>;

  try {
    publishedSurvey = await getPublishedSurvey(surveyId);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return {
        title: '演示数据库暂时不可用',
        description: '当前无法读取问卷数据，请稍后刷新重试。',
        robots: { index: false, follow: false }
      };
    }

    throw error;
  }

  if (!publishedSurvey) {
    return {
      title: '问卷暂未开放填写',
      description: '这份 Wenjuan 问卷暂未发布或已停止开放填写。',
      robots: { index: false, follow: false }
    };
  }

  return {
    title: `${publishedSurvey.document.title}｜填写问卷`,
    description: publishedSurvey.document.description || `填写「${publishedSurvey.document.title}」问卷。`,
    alternates: { canonical: `/f/${surveyId}` },
    openGraph: {
      title: `${publishedSurvey.document.title}｜填写问卷`,
      description: publishedSurvey.document.description || '在线填写 Wenjuan 问卷。',
      url: `/f/${surveyId}`
    }
  };
}

export default async function FillSurveyPage({
  params
}: {
  params: Promise<{ surveyId: string }>;
}) {
  const { surveyId } = await params;
  let publishedSurvey: Awaited<ReturnType<typeof getPublishedSurvey>>;

  try {
    publishedSurvey = await getPublishedSurvey(surveyId);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableNotice
          helper=""
          message="由于网络波动或服务维护，该问卷当前无法加载。请稍后再试或联系问卷发布者。"
          retryHref={`/f/${surveyId}`}
          showHomeAction={false}
          showShowcaseAction={false}
          title="问卷暂时无法访问"
        />
      );
    }

    throw error;
  }

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

  const cookieStore = await cookies();
  const initialSubmitted =
    cookieStore.get(getSurveySubmissionCookieName(surveyId))?.value === getSurveySubmissionCookieValue();

  return <PublishedSurveyPage document={publishedSurvey.document} initialSubmitted={initialSubmitted} surveyId={surveyId} />;
}
