import type { Metadata } from 'next';
import Link from 'next/link';
import { HomeSurveyActions } from '@/components/home/HomeSurveyActions';
import { listSurveyDrafts, type SurveyListItem } from '@/features/persistence/repository';


export const metadata: Metadata = {
  title: '问卷中心',
  description: '集中管理 Wenjuan 的草稿、已发布问卷和答卷数据，快速继续编辑、查看填写页或分析结果。',
  alternates: { canonical: '/surveys' }
};

const SURVEYS_PAGE_SIZE = 10;

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

function getStatusLabel(status: string) {
  switch (status) {
    case 'published':
      return '已发布';
    case 'draft':
      return '草稿';
    case 'responded':
      return '有答卷';
    default:
      return '全部问卷';
  }
}

function getEmptyText(status: string) {
  switch (status) {
    case 'published':
      return '当前还没有已发布问卷。';
    case 'draft':
      return '当前还没有草稿问卷。';
    case 'responded':
      return '当前还没有收到答卷的问卷。';
    default:
      return '还没有问卷，先让 AI 帮你生成一份。';
  }
}

function normalizeStatus(status: string) {
  return ['published', 'draft', 'responded'].includes(status) ? status : 'all';
}

function getPageHref(status: string, page: number) {
  const params = new URLSearchParams();

  if (status !== 'all') {
    params.set('status', status);
  }

  if (page > 1) {
    params.set('page', String(page));
  }

  const queryString = params.toString();
  return queryString ? `/surveys?${queryString}` : '/surveys';
}

export default async function SurveysPage({
  searchParams
}: {
  searchParams?: Promise<{ status?: string; page?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) ?? {};
  const status = normalizeStatus(resolvedSearchParams.status ?? 'all');
  const surveys = await listSurveyDrafts();
  const filteredSurveys = filterSurveys(surveys, status);
  const totalSurveys = surveys.length;
  const publishedSurveys = surveys.filter((survey) => Boolean(survey.publishedVersion)).length;
  const respondedSurveys = surveys.filter((survey) => survey.responseCount > 0).length;
  const totalResponses = surveys.reduce((sum, survey) => sum + survey.responseCount, 0);
  const totalPages = Math.max(1, Math.ceil(filteredSurveys.length / SURVEYS_PAGE_SIZE));
  const requestedPage = Number.parseInt(resolvedSearchParams.page ?? '1', 10);
  const currentPage = Number.isFinite(requestedPage)
    ? Math.min(Math.max(requestedPage, 1), totalPages)
    : 1;
  const pageStart = (currentPage - 1) * SURVEYS_PAGE_SIZE;
  const pagedSurveys = filteredSurveys.slice(pageStart, pageStart + SURVEYS_PAGE_SIZE);
  const stats = [
    { label: '全部问卷', status: 'all', href: '/surveys', count: totalSurveys, hint: `累计 ${totalResponses} 份答卷` },
    { label: '已发布', status: 'published', href: '/surveys?status=published', count: publishedSurveys, hint: '正在对外收集' },
    { label: '草稿', status: 'draft', href: '/surveys?status=draft', count: totalSurveys - publishedSurveys, hint: '还未发布' },
    { label: '有答卷', status: 'responded', href: '/surveys?status=responded', count: respondedSurveys, hint: `累计 ${totalResponses} 份答卷` }
  ];

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1120px] flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <header className="ui-surface p-6 md:p-8">
        <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <nav aria-label="当前位置" className="flex items-center gap-2 text-xs font-[600] text-[#667085]">
              <Link className="text-[#2563eb] hover:underline" href="/">
                首页
              </Link>
              <span aria-hidden="true">/</span>
              <span>问卷中心</span>
            </nav>
            <div className="space-y-2">
              <h1 className="m-0 text-[30px] font-[700] tracking-tight text-[#101828]">问卷中心</h1>
              <p className="m-0 text-sm leading-6 text-[#667085]">
                集中管理草稿、已发布问卷和答卷数据。
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Link className="ui-btn ui-btn-secondary" href="/">
              返回首页
            </Link>
            <Link className="ui-btn ui-btn-primary" href="/new">
              新建问卷
            </Link>
          </div>
        </div>
      </header>

      <section aria-label="问卷筛选与统计" className="grid gap-3 md:grid-cols-4">
        {stats.map((item) => {
          const active = item.status === status;

          return (
            <Link
              aria-current={active ? 'page' : undefined}
              className={[
                'ui-panel-soft flex min-h-[104px] flex-col justify-between p-4 transition-colors hover:border-[#c4cfdd] hover:bg-[#f1f5f9]',
                active ? 'border-[#bfdbfe] bg-[#eff6ff]' : ''
              ].join(' ')}
              href={item.href}
              key={item.status}
            >
              <span className="text-sm font-[600] text-[#667085]">{item.label}</span>
              <span className="flex items-end justify-between gap-3">
                <strong className="text-[30px] leading-none text-[#101828]">{item.count}</strong>
                <span className="text-xs text-[#667085]">{item.hint}</span>
              </span>
            </Link>
          );
        })}
      </section>

      <section className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-3">
          <h2 className="m-0 text-[18px] font-[600] text-[#101828]">{getStatusLabel(status)}</h2>
          <span className="text-sm text-[#667085]">
            共 {filteredSurveys.length} 份 · <span>第 {currentPage} / {totalPages} 页</span>
          </span>
        </div>

        {pagedSurveys.length ? (
          <div className="flex flex-col gap-3">
            {pagedSurveys.map((survey) => {
              const isLocked = Boolean(survey.publishedVersion && survey.responseCount > 0);

              return (
                <article
                  className="ui-panel flex flex-col gap-4 p-5 transition-colors hover:border-[#c4cfdd] md:flex-row md:items-center md:justify-between"
                  key={survey.surveyId}
                >
                  <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <strong className="text-[16px] font-[600] text-[#101828]">{survey.title}</strong>
                      {survey.publishedVersion ? (
                        <span className={`ui-chip ${isLocked ? 'ui-chip-warning' : 'ui-chip-success'}`}>
                          {isLocked ? `已锁定 · v${survey.publishedVersion}` : `已发布 v${survey.publishedVersion}`}
                        </span>
                      ) : (
                        <span className="ui-chip">草稿</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-[13px] text-[#667085]">
                      <span>更新于 {formatUpdatedAt(survey.updatedAt)}</span>
                      {survey.publishedVersion ? <span>当前版本 v{survey.currentVersion}</span> : null}
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
            <strong className="text-[16px] font-[500] text-[#101828]">没有匹配的问卷</strong>
            <p className="mb-0 mt-2 text-[14px] text-[#667085]">{getEmptyText(status)}</p>
            <a className="ui-btn ui-btn-primary mt-4" href="/new">
              生成新问卷
            </a>
          </div>
        )}

        {filteredSurveys.length > SURVEYS_PAGE_SIZE ? (
          <nav aria-label="问卷分页" className="ui-panel flex flex-wrap items-center justify-between gap-3 p-4">
            <span className="text-sm text-[#667085]">
              每页 {SURVEYS_PAGE_SIZE} 份 · 第 {currentPage} / {totalPages} 页
            </span>
            <div className="flex items-center gap-2">
              {currentPage > 1 ? (
                <Link className="ui-btn ui-btn-secondary" href={getPageHref(status, currentPage - 1)}>
                  上一页
                </Link>
              ) : (
                <span className="ui-btn ui-btn-secondary opacity-50">上一页</span>
              )}
              {currentPage < totalPages ? (
                <Link className="ui-btn ui-btn-secondary" href={getPageHref(status, currentPage + 1)}>
                  下一页
                </Link>
              ) : (
                <span className="ui-btn ui-btn-secondary opacity-50">下一页</span>
              )}
            </div>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
