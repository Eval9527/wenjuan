'use client';

import { useEffect, useState } from 'react';
import { SurveyRenderer } from '@/features/renderer/SurveyRenderer';
import type { RendererMode } from '@/features/renderer/renderers';
import { buildSurveySubmissionCookie } from '@/features/responses/submission-cookie';
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
  document,
  initialSubmitted = false
}: {
  surveyId: string;
  document: SurveyDocument;
  initialSubmitted?: boolean;
}) {
  const [submitted, setSubmitted] = useState(initialSubmitted);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [rendererMode, setRendererMode] = useState<RendererMode>('published-desktop');
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
        padding: isCompact ? 0 : 24,
        background: 'var(--page-bg)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: isCompact ? 'stretch' : 'flex-start'
      }}
    >
      <div
        className="editor-preview-frame published-survey-frame"
        style={{
          height: 'auto',
          minHeight: isCompact ? '100vh' : 'auto',
          display: 'flex',
          flexDirection: 'column',
          gap: 16,
          borderRadius: isCompact ? 0 : 8,
          margin: 0
        }}
      >
        {submitted ? (
          <section
            style={{
              padding: '60px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 16
            }}
          >
            <div style={{ width: 64, height: 64, borderRadius: '50%', background: '#ecfdf3', color: '#027a48', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, marginBottom: 8 }}>✓</div>
            <strong style={{ fontSize: 24, margin: 0 }}>提交成功，感谢填写</strong>
            <p style={{ margin: 0, color: '#667085' }}>您的答卷已成功记录。</p>
          </section>
        ) : (
          <form
            className="published-survey-form"
            data-testid="published-survey-form"
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

                await response.json();
                globalThis.document.cookie = buildSurveySubmissionCookie(surveyId);
                setSubmitted(true);
              } catch (submitError) {
                setError(submitError instanceof Error ? '提交失败，请稍后重试' : '提交失败');
              } finally {
                setIsSubmitting(false);
              }
            }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            <SurveyRenderer document={document} mode={rendererMode} />
            <div style={{ padding: '0 12px', display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4 }}>
              {error ? <p style={{ margin: 0, color: '#b42318' }}>{error}</p> : null}
              <button
                aria-label={isSubmitting ? '提交中' : document.settings.submitLabel}
                className="ui-btn ui-btn-primary"
                disabled={isSubmitting}
                type="submit"
                style={{ height: 44, fontSize: 16 }}
              >
                {isSubmitting ? '提交中...' : document.settings.submitLabel}
              </button>
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
