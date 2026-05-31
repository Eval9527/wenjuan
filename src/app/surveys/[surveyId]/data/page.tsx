import type { Metadata } from 'next';
import { DatabaseUnavailableNotice } from '@/components/system/DatabaseUnavailableNotice';
import { isDatabaseUnavailableError } from '@/features/persistence/errors';
import { getPublishedSurvey, listSurveyResponses } from '@/features/persistence/repository';
import { buildSurveyResponseAnalytics, type QuestionAnalytics } from '@/features/responses/analytics';


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

  return {
    title: publishedSurvey ? `问卷数据：${publishedSurvey.document.title}` : '问卷数据',
    description: '查看 Wenjuan 已发布问卷的答卷统计、选项比例和最近提交数据。',
    robots: { index: false, follow: false }
  };
}

function formatSubmittedAt(value: string) {
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

function QuestionTypeBadge({ type }: { type: QuestionAnalytics['type'] }) {
  const label = type === 'input' ? '填写题' : type === 'singleChoice' ? '单选题' : '多选题';

  return <span className="ui-chip">{label}</span>;
}

function ChoiceBar({
  label,
  count,
  percentage
}: {
  label: string;
  count: number;
  percentage: number;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3 text-sm">
        <span className="font-[500] text-[#101828]">{label}</span>
        <span className="shrink-0 text-[#667085]">
          {count} 票 · <span>{percentage}%</span>
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#eef2f6]" aria-hidden="true">
        <div
          className="h-full rounded-full bg-[#2563eb]"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function QuestionCard({ question }: { question: QuestionAnalytics }) {
  return (
    <section className="ui-panel flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="space-y-1">
          <h2 className="m-0 text-[18px] font-[600] text-[#101828]">{question.label}</h2>
          <p className="m-0 text-sm text-[#667085]">
            {question.type === 'input'
              ? `${question.answerCount} 条文本答复 · ${question.emptyCount} 人未填写`
              : `${question.answeredCount} 人作答 · ${question.emptyCount} 人未选择`}
          </p>
        </div>
        <QuestionTypeBadge type={question.type} />
      </div>

      {question.type === 'input' ? (
        question.answers.length ? (
          <div className="grid gap-2 md:grid-cols-2">
            {question.answers.slice(0, 8).map((answer, index) => (
              <div className="rounded-lg border border-[#d7dee8] bg-[#f8fafc] px-3 py-2 text-sm text-[#101828]" key={`${index}-${answer}`}>
                {answer}
              </div>
            ))}
          </div>
        ) : (
          <p className="m-0 rounded-lg bg-[#f8fafc] px-3 py-2 text-sm text-[#667085]">暂时没有文本答复。</p>
        )
      ) : (
        <div className="flex flex-col gap-4">
          {question.options.map((option) => (
            <ChoiceBar
              count={option.count}
              key={option.label}
              label={option.label}
              percentage={option.percentage}
            />
          ))}
          {question.unknownOptions.map((option) => (
            <ChoiceBar
              count={option.count}
              key={`unknown-${option.label}`}
              label={`其他：${option.label}`}
              percentage={option.percentage}
            />
          ))}
        </div>
      )}
    </section>
  );
}

export default async function SurveyDataPage({
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
          message="统计数据服务暂时不可用。如果这是你的私有部署版本，请检查 DATABASE_URL 连接配置是否正确。"
          retryHref={`/surveys/${surveyId}/data`}
          showShowcaseAction={false}
          title="无法加载分析数据"
        />
      );
    }

    throw error;
  }

  if (!publishedSurvey) {
    return (
      <main className="mx-auto flex min-h-screen w-full max-w-[760px] flex-col items-center justify-center px-4 py-12">
        <section className="ui-panel w-full p-6 text-center">
          <span className="ui-kicker mb-4">问卷数据</span>
          <h1 className="m-0 text-[24px] font-[700] text-[#101828]">问卷暂未发布，暂无数据</h1>
          <p className="mb-0 mt-3 text-sm leading-6 text-[#667085]">
            发布并收集答卷后，这里会展示每道题的提交数据和比例。
          </p>
          <a className="ui-btn ui-btn-primary mt-5" href="/">
            返回工作台
          </a>
        </section>
      </main>
    );
  }

  let responses: Awaited<ReturnType<typeof listSurveyResponses>>;

  try {
    responses = await listSurveyResponses(surveyId);
  } catch (error) {
    if (isDatabaseUnavailableError(error)) {
      return (
        <DatabaseUnavailableNotice
          helper=""
          message="统计数据服务暂时不可用。如果这是你的私有部署版本，请检查 DATABASE_URL 连接配置是否正确。"
          retryHref={`/surveys/${surveyId}/data`}
          showShowcaseAction={false}
          title="无法加载分析数据"
        />
      );
    }

    throw error;
  }

  const analytics = buildSurveyResponseAnalytics(publishedSurvey.document, responses);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-[1040px] flex-col gap-6 px-4 py-8 md:px-8 md:py-12">
      <header className="ui-surface p-6 md:p-8">
        <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
          <div className="space-y-3">
            <span className="ui-kicker">问卷数据</span>
            <div className="space-y-2">
              <h1 className="m-0 text-[28px] font-[700] tracking-tight text-[#101828]">
                {publishedSurvey.document.title}
              </h1>
              <p className="m-0 text-sm leading-6 text-[#667085]">
                根据已发布版本 v{publishedSurvey.version} 统计，展示每道可答题目的提交数据和选择比例。
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-xl border border-[#d7dee8] bg-[#f8fafc] p-4 text-right">
            <strong className="text-[28px] leading-none text-[#101828]">{analytics.responseCount}</strong>
            <span className="text-sm text-[#667085]">共 {analytics.responseCount} 份答卷</span>
          </div>
        </div>
      </header>

      {analytics.questions.length ? (
        <div className="grid gap-4">
          {analytics.questions.map((question) => (
            <QuestionCard key={question.blockId} question={question} />
          ))}
        </div>
      ) : (
        <section className="ui-panel p-6 text-center">
          <strong className="text-[#101828]">当前问卷还没有可统计题目</strong>
          <p className="mb-0 mt-2 text-sm text-[#667085]">标题和说明文字不会生成数据卡片。</p>
        </section>
      )}

      <section className="ui-panel p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="m-0 text-[18px] font-[600] text-[#101828]">最近提交数据</h2>
          <span className="text-sm text-[#667085]">最多显示最近 10 条</span>
        </div>
        {responses.length ? (
          <div className="overflow-hidden rounded-xl border border-[#d7dee8]">
            <table className="w-full border-collapse bg-white text-left text-sm">
              <thead className="bg-[#f8fafc] text-[#667085]">
                <tr>
                  <th className="border-b border-[#d7dee8] px-4 py-3 font-[600]">提交时间</th>
                  <th className="border-b border-[#d7dee8] px-4 py-3 font-[600]">答卷内容</th>
                </tr>
              </thead>
              <tbody>
                {responses.slice(0, 10).map((response) => (
                  <tr key={response.id}>
                    <td className="border-b border-[#eef2f6] px-4 py-3 text-[#667085]">
                      {formatSubmittedAt(response.submittedAt)}
                    </td>
                    <td className="border-b border-[#eef2f6] px-4 py-3 text-[#101828]">
                      {Object.values(response.answers)
                        .map((value) => (Array.isArray(value) ? value.join('、') : value))
                        .filter(Boolean)
                        .join('；') || '未填写'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="m-0 rounded-xl bg-[#f8fafc] px-4 py-6 text-center text-sm text-[#667085]">
            还没有收到答卷。分享填写页后，数据会自动汇总到这里。
          </p>
        )}
      </section>
    </main>
  );
}
