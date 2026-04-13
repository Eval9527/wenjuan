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
    <section
      style={{
        border: '1px solid #d7deea',
        borderRadius: 16,
        padding: 16,
        background: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        gap: 12
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'flex-start' }}>
        <div>
          <h3 style={{ margin: 0 }}>发布与答卷</h3>
          <p style={{ margin: '6px 0 0', color: '#667085' }}>
            {publishedVersion
              ? `已发布 v${publishedVersion}，现在可以分享填写链接并查看最近答卷。`
              : '发布后即可获得填写链接，并在这里查看最近答卷。'}
          </p>
        </div>
        {publishedVersion ? (
          <button
            disabled={responseFeedState?.status === 'loading'}
            onClick={onRefreshResponses}
            type="button"
          >
            {responseFeedState?.status === 'loading' ? '刷新中...' : '刷新答卷'}
          </button>
        ) : null}
      </div>

      {publishedVersion ? (
        <>
          <div
            style={{
              border: '1px solid #d7deea',
              borderRadius: 12,
              background: '#fff',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 8
            }}
          >
            <span style={{ fontSize: 12, color: '#667085' }}>填写链接</span>
            <code style={{ wordBreak: 'break-all' }}>{fillPath}</code>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <a href={fillPath}>打开填写页</a>
              <button onClick={handleCopy} type="button">
                复制填写链接
              </button>
            </div>
            {copyMessage ? <p style={{ margin: 0, color: '#667085' }}>{copyMessage}</p> : null}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <strong>最近答卷 · 已收集 {responseCount} 份</strong>
            {responseFeedState?.message ? (
              <p
                style={{
                  margin: 0,
                  color: responseFeedState.status === 'error' ? '#b42318' : '#667085'
                }}
              >
                {responseFeedState.message}
              </p>
            ) : null}
            {responseCount === 0 ? (
              <p style={{ margin: 0, color: '#667085' }}>还没有收到答卷，先把链接发出去试试。</p>
            ) : recentResponses?.length ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {recentResponses.map((response) => (
                  <article
                    key={response.id}
                    style={{
                      border: '1px solid #d7deea',
                      borderRadius: 12,
                      background: '#fff',
                      padding: 12,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 6
                    }}
                  >
                    <strong>{getResponsePreview(response)}</strong>
                    <p style={{ margin: 0, color: '#667085' }}>
                      提交于 {formatSubmittedAt(response.submittedAt)} · v{response.version}
                    </p>
                    <div>
                      <button
                        aria-label={`查看详情 ${response.id}`}
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
              <p style={{ margin: 0, color: '#667085' }}>正在同步最近答卷...</p>
            )}

            {selectedResponse ? (
              <section
                style={{
                  border: '1px solid #d7deea',
                  borderRadius: 12,
                  background: '#fff',
                  padding: 12,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 10
                }}
              >
                <div>
                  <strong>答卷详情</strong>
                  <p style={{ margin: '6px 0 0', color: '#667085' }}>
                    {selectedResponse.id} · 提交于 {formatSubmittedAt(selectedResponse.submittedAt)}
                  </p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {Object.entries(selectedResponse.answers).map(([questionId, value]) => (
                    <div
                      key={questionId}
                      style={{
                        borderTop: '1px solid #eef2f8',
                        paddingTop: 8,
                        display: 'flex',
                        flexDirection: 'column',
                        gap: 4
                      }}
                    >
                      <span style={{ fontSize: 12, color: '#667085' }}>{questionLabelMap[questionId] ?? questionId}</span>
                      <strong>{formatAnswerValue(value) || '未填写'}</strong>
                    </div>
                  ))}
                </div>
              </section>
            ) : null}
          </div>
        </>
      ) : null}
    </section>
  );
}
