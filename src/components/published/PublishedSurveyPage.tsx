'use client';

import { useEffect, useMemo, useState } from 'react';
import { SurveyRenderer } from '@/features/renderer/SurveyRenderer';
import type { RendererMode } from '@/features/renderer/renderers';
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
  const [rendererMode, setRendererMode] = useState<RendererMode>('published-desktop');
  const questionCount = document.blocks.length;
  const answerableCount = useMemo(
    () => document.blocks.filter((block) => block.type !== 'title' && block.type !== 'paragraph').length,
    [document.blocks]
  );
  const isCompact = rendererMode === 'published-mobile';

  useEffect(() => {
    function syncRendererMode() {
      setRendererMode(window.innerWidth <= 640 ? 'published-mobile' : 'published-desktop');
    }

    syncRendererMode();
    window.addEventListener('resize', syncRendererMode);

    return () => {
      window.removeEventListener('resize', syncRendererMode);
    };
  }, []);

  return (
    <main
      style={{
        minHeight: '100vh',
        padding: isCompact ? 12 : 24,
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
          borderRadius: 8,
          border: '1px solid #d7deea',
          padding: isCompact ? 16 : 24,
          display: 'flex',
          flexDirection: 'column',
          gap: 20
        }}
      >
        <header
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 16,
            alignItems: isCompact ? 'flex-start' : 'center',
            flexDirection: isCompact ? 'column' : 'row'
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <span
              style={{
                display: 'inline-flex',
                width: 'fit-content',
                borderRadius: 999,
                padding: '4px 10px',
                background: '#eef2ff',
                color: '#3538cd',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              公开填写页
            </span>
            <strong>{document.title}</strong>
            <p style={{ margin: 0, color: '#667085' }}>共 {questionCount} 题 · 当前版本 v{document.meta.version}</p>
            <p style={{ margin: 0, color: '#667085' }}>支持 PC 与移动端访问，提交后会直接进入答卷收集列表。</p>
          </div>
          <a className="ui-btn ui-btn-secondary" href="/">返回工作台</a>
        </header>

        {submitted ? (
          <section
            style={{
              border: '1px solid #d7deea',
              borderRadius: 8,
              padding: 20,
              background: '#f8fafc'
            }}
          >
            <strong>提交成功，感谢填写</strong>
            <p style={{ margin: '8px 0 0', color: '#667085' }}>已累计收到 {submitted.responseCount} 份答卷。</p>
            <p style={{ margin: '8px 0 0', color: '#667085' }}>
              本次填写已进入答卷收件箱，可回到编辑器查看最新答卷详情。
            </p>
            <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 12 }}>
              <a href="/">返回工作台</a>
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
            <section
              style={{
                border: '1px solid #d7deea',
                borderRadius: 8,
                background: '#f8fafc',
                padding: isCompact ? 14 : 18,
                display: 'flex',
                flexDirection: 'column',
                gap: 8
              }}
            >
              <strong>填写说明</strong>
              <p style={{ margin: 0, color: '#667085' }}>
                本问卷当前共有 {answerableCount} 个可填写题目，提交后将实时进入问卷答卷列表。
              </p>
            </section>
            <SurveyRenderer document={document} mode={rendererMode} />
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
