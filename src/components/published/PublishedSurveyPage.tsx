'use client';

import { useState } from 'react';
import { SurveyRenderer } from '@/features/renderer/SurveyRenderer';
import type { SurveyDocument } from '@/features/survey-schema/schema';

export function PublishedSurveyPage({
  surveyId,
  document
}: {
  surveyId: string;
  document: SurveyDocument;
}) {
  const [submitted, setSubmitted] = useState(false);

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
            <p style={{ margin: '8px 0 0', color: '#667085' }}>本 demo 暂未记录答卷明细，但页面流转已经打通。</p>
          </section>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              setSubmitted(true);
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 20 }}
          >
            <SurveyRenderer document={document} mode="published-desktop" />
            <button type="submit">{document.settings.submitLabel}</button>
          </form>
        )}
      </div>
    </main>
  );
}
