'use client';

import { useMemo, useState } from 'react';

export function HomeSurveyActions({
  surveyId,
  published,
  responseCount
}: {
  surveyId: string;
  published: boolean;
  responseCount: number;
}) {
  const [copyMessage, setCopyMessage] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const fillPath = `/f/${surveyId}`;
  const fillUrl = useMemo(() => {
    if (typeof window === 'undefined') {
      return fillPath;
    }

    return new URL(fillPath, window.location.origin).toString();
  }, [fillPath]);

  async function handleCopy() {
    if (!navigator.clipboard?.writeText) {
      setCopyMessage('不支持自动复制');
      setTimeout(() => setCopyMessage(''), 2000);
      return;
    }

    try {
      await navigator.clipboard.writeText(fillUrl);
      setCopyMessage('已复制');
      setTimeout(() => setCopyMessage(''), 2000);
    } catch (error) {
      setCopyMessage('复制失败');
      setTimeout(() => setCopyMessage(''), 2000);
    }
  }

  async function handleDuplicateSurvey() {
    setIsDuplicating(true);
    setCopyMessage('');

    try {
      const response = await fetch(`/api/surveys/${surveyId}/copy`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Survey duplicate failed');
      }

      const payload = await response.json();
      window.location.href = `/editor/${payload.surveyId}`;
    } catch (error) {
      setCopyMessage('复制问卷失败');
      setTimeout(() => setCopyMessage(''), 2000);
      setIsDuplicating(false);
    }
  }

  return (
    <div className="flex items-center justify-end gap-2">
      {copyMessage && (
        <span className="text-[13px] text-[#027a48] mr-2">{copyMessage}</span>
      )}
      
      {published ? (
        <button className="ui-btn ui-btn-ghost" onClick={handleCopy} type="button">
          复制链接
        </button>
      ) : null}

      <button className="ui-btn ui-btn-secondary" disabled={isDuplicating} onClick={handleDuplicateSurvey} type="button">
        {isDuplicating ? '复制中...' : '复制问卷'}
      </button>

      {published ? (
        <a className="ui-btn ui-btn-secondary" href={fillPath}>
          填写页
        </a>
      ) : null}

      <a className="ui-btn ui-btn-primary" href={published ? fillPath : `/editor/${surveyId}`}>
        {published ? '查看填写页' : '继续编辑'}
      </a>
    </div>
  );
}
