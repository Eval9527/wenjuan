'use client';

import { useMemo, useState } from 'react';

export function HomeSurveyActions({
  surveyId,
  published
}: {
  surveyId: string;
  published: boolean;
}) {
  const [copyMessage, setCopyMessage] = useState('');
  const fillPath = `/f/${surveyId}`;
  const fillUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return fillPath;
    }

    return new URL(fillPath, window.location.origin).toString();
  }, [fillPath]);

  async function handleCopy() {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage('当前环境不支持自动复制');
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
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        <a href={`/editor/${surveyId}`}>继续编辑</a>
        {published ? <a href={fillPath}>填写页面</a> : null}
        {published ? (
          <button onClick={handleCopy} type="button">
            复制填写链接
          </button>
        ) : null}
      </div>
      {published ? (
        copyMessage ? <p style={{ margin: 0, color: '#667085' }}>{copyMessage}</p> : null
      ) : (
        <p style={{ margin: 0, color: '#667085' }}>待发布后可分享</p>
      )}
    </div>
  );
}
