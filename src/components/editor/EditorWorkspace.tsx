'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorShell, type EditorPersistenceState } from '@/components/editor/EditorShell';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

const AUTOSAVE_DELAY = 800;

export function EditorWorkspace({ surveyId }: { surveyId: string }) {
  const [initialSurvey, setInitialSurvey] = useState<SurveyDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [persistenceState, setPersistenceState] = useState<EditorPersistenceState>({
    status: 'idle',
    message: '草稿尚未保存'
  });
  const latestSurveyRef = useRef<SurveyDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequenceRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadSurvey() {
      setIsLoading(true);

      try {
        const response = await fetch(`/api/surveys/${surveyId}`);

        if (response.status === 404) {
          if (cancelled) {
            return;
          }

          const emptySurvey = createEmptySurvey({ id: surveyId });
          setInitialSurvey(emptySurvey);
          latestSurveyRef.current = emptySurvey;
          setPersistenceState({
            status: 'idle',
            message: '新问卷，等待首次保存'
          });
          return;
        }

        if (!response.ok) {
          throw new Error('Survey load failed');
        }

        const payload = await response.json();
        const document = surveyDocumentSchema.parse(payload.document);

        if (cancelled) {
          return;
        }

        setInitialSurvey(document);
        latestSurveyRef.current = document;
        setPersistenceState({
          status: 'saved',
          message: '草稿已加载'
        });
      } catch (error) {
        if (cancelled) {
          return;
        }

        const emptySurvey = createEmptySurvey({ id: surveyId });
        setInitialSurvey(emptySurvey);
        latestSurveyRef.current = emptySurvey;
        setPersistenceState({
          status: 'error',
          message: error instanceof Error ? '加载失败，已回退为空白问卷' : '加载失败'
        });
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    void loadSurvey();

    return () => {
      cancelled = true;

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }
    };
  }, [surveyId]);

  const handleSurveyChange = useCallback(
    (survey: SurveyDocument) => {
      latestSurveyRef.current = survey;
      setPersistenceState({
        status: 'saving',
        message: `正在保存 v${survey.meta.version}...`
      });

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(async () => {
        const requestId = ++requestSequenceRef.current;

        try {
          const response = await fetch(`/api/surveys/${surveyId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              document: latestSurveyRef.current
            })
          });

          if (!response.ok) {
            throw new Error('Survey save failed');
          }

          const payload = await response.json();

          if (requestId !== requestSequenceRef.current) {
            return;
          }

          setPersistenceState({
            status: 'saved',
            message: `已保存 v${payload.version}`
          });
        } catch (error) {
          if (requestId !== requestSequenceRef.current) {
            return;
          }

          setPersistenceState({
            status: 'error',
            message: error instanceof Error ? '保存失败，请稍后重试' : '保存失败'
          });
        }
      }, AUTOSAVE_DELAY);
    },
    [surveyId]
  );

  if (isLoading || !initialSurvey) {
    return (
      <main
        style={{
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          background: '#eef2f8',
          color: '#101828'
        }}
      >
        <div style={{ textAlign: 'center' }}>
          <strong>正在加载问卷...</strong>
          <p style={{ margin: '8px 0 0', color: '#667085' }}>准备草稿与编辑器状态。</p>
        </div>
      </main>
    );
  }

  return (
    <EditorShell
      initialSurvey={initialSurvey}
      onSurveyChange={handleSurveyChange}
      persistenceState={persistenceState}
      surveyId={surveyId}
    />
  );
}
