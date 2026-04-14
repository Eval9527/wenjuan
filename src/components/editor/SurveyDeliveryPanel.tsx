'use client';

import { useEffect, useMemo, useState } from 'react';
import type { SurveyResponseRecord, SurveyResponseValue } from '@/features/persistence/contracts';
import { useEditorStore } from './editor-store-context';

export type ResponseFeedState = {
  status: 'idle' | 'loading' | 'error';
  message: string;
};

function formatAnswerValue(value: SurveyResponseValue) {
  return Array.isArray(value) ? value.join('、') : value;
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

function getResponsePreview(response: SurveyResponseRecord) {
  const parts = Object.values(response.answers)
    .map((value) => formatAnswerValue(value))
    .filter(Boolean)
    .slice(0, 3);

  return parts.length ? parts.join(' · ') : '暂时没有可展示的填写内容';
}

export function SurveyDeliveryPanel({
  surveyId,
  publishedVersion,
  responseCount,
  recentResponses,
  responseFeedState,
  onRefreshResponses
}: {
  surveyId: string;
  publishedVersion: number | null;
  responseCount: number;
  recentResponses?: SurveyResponseRecord[];
  responseFeedState?: ResponseFeedState;
  onRefreshResponses?: () => void;
}) {
  const [copyMessage, setCopyMessage] = useState('');
  const [selectedResponseId, setSelectedResponseId] = useState<string | null>(null);
  const fillPath = `/f/${surveyId}`;
  const surveyBlocks = useEditorStore((state) => state.survey.blocks);
  const questionLabelMap = useMemo(
    () =>
      Object.fromEntries(
        surveyBlocks
          .filter((block) => block.type !== 'title')
          .map((block) => [block.id, block.label])
      ),
    [surveyBlocks]
  );
  const fillUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return fillPath;
    }

    return new URL(fillPath, window.location.origin).toString();
  }, [fillPath]);
  const recentResponseCount = recentResponses?.length ?? 0;
  const selectedResponse = useMemo(
    () => recentResponses?.find((response) => response.id === selectedResponseId) ?? null,
    [recentResponses, selectedResponseId]
  );

  useEffect(() => {
    if (!recentResponses?.length) {
      setSelectedResponseId(null);
      return;
    }

    if (selectedResponseId && !recentResponses.some((response) => response.id === selectedResponseId)) {
      setSelectedResponseId(null);
    }
  }, [recentResponses, selectedResponseId]);

  async function handleCopy() {
    if (typeof navigator === 'undefined' || !navigator.clipboard?.writeText) {
      setCopyMessage('当前环境不支持自动复制，请手动复制链接');
      return;
    }

    try {
      await navigator.clipboard.writeText(fillUrl);
      setCopyMessage('链接已复制');
    } catch (error) {
      setCopyMessage(error instanceof Error ? '复制失败，请手动复制链接' : '复制失败');
    }
  }

  return (
    <section className="ui-panel-soft flex flex-col gap-4 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="ui-section-title text-[18px]">发布与答卷</h3>
          <p className="mt-2 mb-0 text-sm leading-6 text-[#667085]">
            {publishedVersion
              ? `已发布 v${publishedVersion}，现在可以分享填写链接并查看最近答卷。`
              : '发布后即可获得填写链接，并在这里查看最近答卷。'}
          </p>
        </div>
        {publishedVersion ? (
          <button className="ui-btn ui-btn-secondary" disabled={responseFeedState?.status === 'loading'} onClick={onRefreshResponses} type="button">
            {responseFeedState?.status === 'loading' ? '刷新中...' : '刷新答卷'}
          </button>
        ) : null}
      </div>

      {publishedVersion ? (
        <>
          <div className="ui-panel flex flex-col gap-3 p-4">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-[#667085]">填写链接</span>
            <code className="rounded-2xl bg-[#f8fafc] px-3 py-3 text-sm text-[#101828]">{fillPath}</code>
            <div className="flex flex-wrap gap-2">
              <a className="ui-btn ui-btn-secondary" href={fillPath}>
                打开填写页
              </a>
              <button className="ui-btn ui-btn-ghost" onClick={handleCopy} type="button">
                复制填写链接
              </button>
            </div>
            {copyMessage ? <p className="m-0 text-sm text-[#667085]">{copyMessage}</p> : null}
          </div>

          <div className="flex flex-col gap-3">
            <strong className="text-[15px] leading-6 text-[#101828]">
              {recentResponseCount ? `最近 ${recentResponseCount} 条 · 共 ${responseCount} 份答卷` : `最近答卷 · 已收集 ${responseCount} 份`}
            </strong>
            {responseFeedState?.message ? (
              <p className={`m-0 text-sm ${responseFeedState.status === 'error' ? 'text-[#b42318]' : 'text-[#667085]'}`}>
                {responseFeedState.message}
              </p>
            ) : recentResponseCount ? (
              <p className="m-0 text-sm text-[#667085]">已为你展示最新提交的答卷，可继续刷新获取最新状态。</p>
            ) : null}

            {responseCount === 0 ? (
              <p className="m-0 text-sm text-[#667085]">还没有收到答卷，先把链接发出去试试。</p>
            ) : recentResponses?.length ? (
              <div className="flex flex-col gap-3">
                {recentResponses.map((response) => (
                  <article className="ui-panel flex flex-col gap-2 p-4" key={response.id}>
                    <strong className="text-[15px] leading-6 text-[#101828]">{getResponsePreview(response)}</strong>
                    <p className="m-0 text-sm text-[#667085]">提交于 {formatSubmittedAt(response.submittedAt)} · v{response.version}</p>
                    <div>
                      <button
                        aria-label={`查看详情 ${response.id}`}
                        className="ui-btn ui-btn-secondary"
                        onClick={() => setSelectedResponseId(response.id)}
                        type="button"
                      >
                        {selectedResponseId === response.id ? '当前查看中' : '查看详情'}
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="m-0 text-sm text-[#667085]">正在同步最近答卷...</p>
            )}

            {selectedResponse ? (
              <section className="ui-panel flex flex-col gap-4 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <strong className="text-[15px] leading-6 text-[#101828]">答卷详情</strong>
                    <p className="mt-1 mb-0 text-sm text-[#667085]">
                      {selectedResponse.id} · 提交于 {formatSubmittedAt(selectedResponse.submittedAt)}
                    </p>
                  </div>
                  <button className="ui-btn ui-btn-ghost" onClick={() => setSelectedResponseId(null)} type="button">
                    关闭详情
                  </button>
                </div>
                <div className="flex flex-col gap-3">
                  {Object.entries(selectedResponse.answers).map(([questionId, value]) => (
                    <div className="border-t border-[#eef2f6] pt-3" key={questionId}>
                      <span className="block text-xs font-medium text-[#667085]">{questionLabelMap[questionId] ?? questionId}</span>
                      <strong className="mt-1 block text-[15px] leading-6 text-[#101828]">{formatAnswerValue(value) || '未填写'}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ) : recentResponses?.length ? (
              <p className="m-0 text-sm text-[#667085]">选择一份答卷查看详情</p>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
