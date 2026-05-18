'use client';

import { useState } from 'react';

export function HomeSurveyActions({
  surveyId,
  published,
  responseCount
}: {
  surveyId: string;
  published: boolean;
  responseCount: number;
}) {
  const [actionMessage, setActionMessage] = useState('');
  const [isDuplicating, setIsDuplicating] = useState(false);
  const fillPath = `/f/${surveyId}`;
  const dataPath = `/surveys/${surveyId}/data`;
  const hasResponses = responseCount > 0;
  const actionCount = published && hasResponses ? 3 : 2;

  async function handleDuplicateSurvey() {
    setIsDuplicating(true);
    setActionMessage('');

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
      setActionMessage('复制问卷失败');
      setTimeout(() => setActionMessage(''), 2000);
      setIsDuplicating(false);
    }
  }

  return (
    <div
      className={[
        'survey-card-actions',
        actionCount === 3 ? 'survey-card-actions--triple' : 'survey-card-actions--double'
      ].join(' ')}
      data-testid="survey-card-actions"
    >
      {actionMessage ? <span className="survey-card-actions__message">{actionMessage}</span> : null}

      <button
        className="ui-btn ui-btn-secondary"
        disabled={isDuplicating}
        onClick={handleDuplicateSurvey}
        type="button"
      >
        {isDuplicating ? '复制中...' : '复制问卷'}
      </button>

      {published && hasResponses ? (
        <a className="ui-btn ui-btn-secondary" href={fillPath}>
          填写页
        </a>
      ) : null}

      <a className="ui-btn ui-btn-primary" href={published ? (hasResponses ? dataPath : fillPath) : `/editor/${surveyId}`}>
        {published ? (hasResponses ? '查看问卷数据' : '查看填写页') : '继续编辑'}
      </a>
    </div>
  );
}
