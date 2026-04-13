'use client';

import { useState } from 'react';
import { SurveyRenderer } from '@/features/renderer/SurveyRenderer';
import type { SurveyDocument } from '@/features/survey-schema/schema';

function toAnswerPayload(formData: FormData) {
  const answers: Record<string, string | string[]> = {};

  for (const [field, value] of formData.entries()) {
    if (typeof value !== 'string') {
      continue;
    }

    const existing = answers[field];

    if (existing === undefined) {
      answers[field] = value;
      continue;
    }

    if (Array.isArray(existing)) {
      answers[field] = [...existing, value];
      continue;
    }

    answers[field] = [existing, value];
  }

  return answers;
}

export function PublishedSurveyPage({
  surveyId,
  document
}: {
  surveyId: string;
  document: SurveyDocument;
}) {
  const [submitted, setSubmitted] = useState<{ responseCount: number } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: 24,
        background: '#eef2f8',
        display: 'flex',
        justifyContent: 'center'
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 760,
          background: '#fff',
          borderRadius: 24,
          border: '1px solid #d7deea',
          padding: 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        <header style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'center' }}>
          <div>
            <strong>{document.title}</strong>
            <p style={{ margin: '6px 0 0', color: '#667085' }}>问卷 ID：{surveyId}</p>
          </div>
          <a href={`/editor/${surveyId}`}>返回编辑器</a>
        </header>

        {submitted ? (
          <section
            style={{
              border: '1px solid #d7deea',
              borderRadius: 16,
              padding: 20,
              background: '#f8fafc'
            }}
          >
            <strong>提交成功，感谢填写</strong>
            <p style={{ margin: '8px 0 0', color: '#667085' }}>已累计收到 {submitted.responseCount} 份答卷。</p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <a href="/">返回工作台</a>
              <a href={`/editor/${surveyId}`}>返回编辑器</a>
              <button
                onClick={() => {
                  setSubmitted(null);
                  setError(null);
                }}
                type="button"
              >
                再填写一份
              </button>
            </div>
          </section>
        ) : (
          <form
            onSubmit={async (event) => {
              event.preventDefault();
              setIsSubmitting(true);
              setError(null);

              try {
                const response = await fetch(`/api/surveys/${surveyId}/responses`, {
                  method: 'POST',
                  headers: {
                    'Content-Type': 'application/json'
                  },
                  body: JSON.stringify({
                    answers: toAnswerPayload(new FormData(event.currentTarget))
                  })
                });

                if (!response.ok) {
                  throw new Error('Response submit failed');
                }

                const payload = await response.json();
                setSubmitted({
                  responseCount: payload.responseCount
                });
              } catch (submitError) {
                setError(submitError instanceof Error ? '提交失败，请稍后重试' : '提交失败');
              } finally {
                setIsSubmitting(false);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <SurveyRenderer document={document} mode="published-desktop" />
            {error ? <p style={{ margin: 0, color: '#b42318' }}>{error}</p> : null}
            <button disabled={isSubmitting} type="submit">
              {isSubmitting ? '提交中...' : document.settings.submitLabel}
            </button>
          </form>
        )}
      </div>
    </main>
  );
}
