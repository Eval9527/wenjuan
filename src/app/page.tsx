import type { Metadata } from 'next';
import { HomeSurveyActions } from '@/components/home/HomeSurveyActions';
import { HomeQuickGenerateForm } from '@/components/home/HomeQuickGenerateForm';
import { listSurveyDrafts, type SurveyListItem } from '@/features/persistence/repository';
import { surveyTemplateCatalog } from '@/features/survey-schema/templates';


export const metadata: Metadata = {
  title: 'AI-first 问卷编辑器',
  description: '向 AI 描述调研需求，快速生成专业问卷，并完成在线编辑、发布收集与答卷分析。',
  alternates: { canonical: '/' }
};

function formatUpdatedAt(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

function filterSurveys(surveys: SurveyListItem[], status: string) {
  switch (status) {
    case 'published':
      return surveys.filter((survey) => Boolean(survey.publishedVersion));
    case 'draft':
      return surveys.filter((survey) => !survey.publishedVersion);
    case 'responded':
      return surveys.filter((survey) => survey.responseCount > 0);
    default:
      return surveys;
  }
}

function getStatusMeta(status: string) {
  switch (status) {
    case 'published':
      return { label: '已发布问卷', empty: '当前还没有已发布问卷。' };
    case 'draft':
      return { label: '草稿问卷', empty: '当前还没有草稿问卷。' };
    case 'responded':
      return { label: '已有答卷问卷', empty: '当前还没有收到答卷的问卷。' };
    default:
      return { label: '最近问卷', empty: '告诉 AI 你想创建什么问卷，立即开始体验。' };
  }
}

function getSurveyCenterHref(status: string) {
  return status === 'all' ? '/surveys' : `/surveys?status=${status}`;
}

export default async function HomePage({
  searchParams
}: {
  searchParams?: Promise<{ view?: string; status?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const surveys = await listSurveyDrafts();
  const totalSurveys = surveys.length;
  const publishedSurveys = surveys.filter((survey) => Boolean(survey.publishedVersion)).length;
  const totalResponses = surveys.reduce((sum, survey) => sum + survey.responseCount, 0);
  const status = resolvedSearchParams.status ?? 'all';
  const filteredSurveys = filterSurveys(surveys, status);
  const visibleSurveys = filteredSurveys.slice(0, 5);
  const statusMeta = getStatusMeta(status);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1080px] flex-col gap-10 px-4 py-8 md:px-8 md:py-12">
      {/* 顶部 AI 交互区 */}
      <section className="flex flex-col items-center justify-center gap-6 py-8">
        <div className="text-center">
          <span className="ui-kicker mb-5">AI-first 问卷工作台</span>
          <h1 className="m-0 text-[32px] font-[700] tracking-tight text-[#101828] md:text-[40px]">
            智能生成 · 在线编辑 · 一键发布
          </h1>
          <p className="mt-4 text-[16px] text-[#667085]">
            向 AI 描述你的调研需求，快速创建专业问卷
          </p>
        </div>

        <div className="w-full max-w-2xl mt-2">
          <HomeQuickGenerateForm />
          
          <div className="mt-6 flex flex-wrap items-center justify-center gap-3 text-sm text-[#667085]">
            <span>或者尝试：</span>
            {surveyTemplateCatalog.map((template) => (
              <a key={template.key} href={`/new?template=${template.key}`} className="rounded-md bg-[#f8fafc] px-3 py-1.5 transition-colors hover:bg-[#eef2f6] hover:text-[#101828]">
                {template.title}
              </a>
            ))}
            <a href="/new" className="rounded-md bg-[#f8fafc] px-3 py-1.5 transition-colors hover:bg-[#eef2f6] hover:text-[#101828]">
              空白开始
            </a>
          </div>
        </div>
      </section>

      {/* 数据看板 */}
      <section className="grid gap-4 md:grid-cols-3">
        {[
          { label: '全部问卷', value: totalSurveys, href: '/surveys' },
          { label: '已发布', value: publishedSurveys, href: '/surveys?status=published' },
          { label: '累计答卷', value: totalResponses, href: '/surveys?status=responded' }
        ].map((item) => (
          <a className="ui-panel-soft flex items-center justify-between p-6 transition-colors hover:bg-[#f1f5f9] hover:border-[#c4cfdd]" href={item.href} key={item.label}>
            <span className="text-[15px] font-[500] text-[#667085]">{item.label}</span>
            <strong className="text-[28px] font-[700] text-[#101828]">{item.value}</strong>
          </a>
        ))}
      </section>

      {/* 问卷列表 */}
      <section className="flex flex-col gap-5" id="recent-surveys">
        <div className="flex items-center justify-between border-b border-[#eef2f6] pb-3">
          <div className="flex items-center gap-3">
            <h2 className="text-[18px] font-[600] text-[#101828] m-0">
              最近问卷
            </h2>
            {status !== 'all' && <span className="ui-chip">筛选中</span>}
          </div>
          
          <div className="flex items-center gap-3">
            {filteredSurveys.length > 5 && (
              <a className="text-sm font-[500] text-[#2563eb] hover:underline" href={getSurveyCenterHref(status)}>
                查看全部
              </a>
            )}
          </div>
        </div>

        {visibleSurveys.length > 0 ? (
          <div className="flex flex-col gap-3">
            {visibleSurveys.map((survey) => {
              const isLocked = Boolean(survey.publishedVersion && survey.responseCount > 0);

              return (
                <article className="ui-panel flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between transition-colors hover:border-[#c4cfdd]" key={survey.surveyId}>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <strong className="text-[16px] font-[600] text-[#101828]">{survey.title}</strong>
                      {survey.publishedVersion ? (
                        <span className={`ui-chip ${isLocked ? 'ui-chip-warning' : 'ui-chip-success'}`}>
                          {isLocked ? `已锁定 · v${survey.publishedVersion}` : `已发布 v${survey.publishedVersion}`}
                        </span>
                      ) : (
                        <span className="ui-chip">草稿</span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-[13px] text-[#667085]">
                      <span>更新于 {formatUpdatedAt(survey.updatedAt)}</span>
                      {survey.publishedVersion && (
                        <span>当前版本 v{survey.currentVersion}</span>
                      )}
                      <span>答卷: {survey.responseCount} 份</span>
                    </div>
                  </div>
                  
                  <div className="shrink-0">
                    <HomeSurveyActions
                      published={Boolean(survey.publishedVersion)}
                      responseCount={survey.responseCount}
                      surveyId={survey.surveyId}
                    />
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[#d7dee8] bg-[#f8fafc] py-16 text-center">
            <strong className="text-[16px] font-[500] text-[#101828]">还没有可展示的问卷</strong>
            <p className="mt-2 mb-0 text-[14px] text-[#667085]">{statusMeta.empty}</p>
            {status === 'all' && (
              <a className="mt-4 ui-btn ui-btn-secondary" href="/new">
                立即创建
              </a>
            )}
          </div>
        )}
      </section>
    </main>
  );
}
