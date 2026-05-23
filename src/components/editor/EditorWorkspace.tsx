'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorShell, type EditorPersistenceState, type EditorPublishState } from '@/components/editor/EditorShell';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

const AUTOSAVE_DELAY = 2500;
const PUBLISH_SUCCESS_RETURN_DELAY = 1600;
const TOAST_DURATION = 2200;

function createPublishState(publishedVersion: number | null, hasUnpublishedChanges = false): EditorPublishState {
  if (!publishedVersion) {
    return {
      status: 'idle',
      message: '尚未发布',
      publishedVersion: null
    };
  }

  return {
    status: 'published',
    message: hasUnpublishedChanges ? `已发布 v${publishedVersion}，当前草稿待重新发布` : `已发布 v${publishedVersion}`,
    publishedVersion
  };
}

export function EditorWorkspace({
  surveyId,
  initialAiPrompt,
  initialTemplateKey
}: {
  surveyId: string;
  initialAiPrompt?: string;
  initialTemplateKey?: string;
}) {
  const [initialSurvey, setInitialSurvey] = useState<SurveyDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [persistenceState, setPersistenceState] = useState<EditorPersistenceState>({
    status: 'idle',
    message: '草稿尚未保存'
  });
  const allowHistoryBackRef = useRef(false);
  const pushedHistoryGuardRef = useRef(false);

  useEffect(() => {
    const shouldWarn = persistenceState.status === 'saving' || persistenceState.status === 'error';
    const message = '当前更改还没有保存完成，确定要离开编辑器吗？';

    function handleBeforeUnload(event: BeforeUnloadEvent) {
      if (!shouldWarn) {
        return;
      }

      event.preventDefault();
      event.returnValue = message;
    }

    function handlePopState() {
      if (allowHistoryBackRef.current) {
        return;
      }

      if (!shouldWarn) {
        allowHistoryBackRef.current = true;
        window.history.back();
        return;
      }

      if (window.confirm(message)) {
        allowHistoryBackRef.current = true;
        window.history.back();
        return;
      }

      window.history.pushState({ wenjuanEditorGuard: true }, '', window.location.href);
    }

    if (!pushedHistoryGuardRef.current) {
      window.history.pushState({ ...(window.history.state ?? {}), wenjuanEditorGuard: true }, '', window.location.href);
      pushedHistoryGuardRef.current = true;
    }

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [persistenceState.status]);

  const [publishState, setPublishState] = useState<EditorPublishState>(createPublishState(null));
  const [responseCount, setResponseCount] = useState(0);
  const [toastMessage, setToastMessage] = useState('');
  const latestSurveyRef = useRef<SurveyDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequenceRef = useRef(0);
  const publishedVersionRef = useRef<number | null>(null);
  const publishReturnTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const toastTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const returnToPreviousPageOrHome = useCallback(() => {
    allowHistoryBackRef.current = true;

    if (window.history.length <= 2) {
      window.location.href = '/';
      return;
    }

    window.history.go(-2);
  }, []);

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
          publishedVersionRef.current = null;
          setPublishState(createPublishState(null));
          setResponseCount(0);
          return;
        }

        if (!response.ok) {
          throw new Error('Survey load failed');
        }

        const payload = await response.json();
        const draftDocument = surveyDocumentSchema.parse(payload.document);
        const publishedDocument = payload.published?.document
          ? surveyDocumentSchema.parse(payload.published.document)
          : null;
        const document = publishedDocument ?? draftDocument;

        if (cancelled) {
          return;
        }

        setInitialSurvey(document);
        latestSurveyRef.current = document;
        publishedVersionRef.current =
          typeof payload.published?.version === 'number' ? payload.published.version : null;
        setPersistenceState({
          status: 'saved',
          message: publishedDocument ? '已加载已发布版本，只读预览' : '草稿已加载'
        });
        setPublishState(
          createPublishState(
            publishedVersionRef.current,
            Boolean(publishedVersionRef.current && draftDocument.meta.version > publishedVersionRef.current)
          )
        );
        setResponseCount(typeof payload.responseCount === 'number' ? payload.responseCount : 0);

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
        publishedVersionRef.current = null;
        setPublishState(createPublishState(null));
        setResponseCount(0);
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

      if (publishReturnTimerRef.current) {
        clearTimeout(publishReturnTimerRef.current);
      }

      if (toastTimerRef.current) {
        clearTimeout(toastTimerRef.current);
      }
    };
  }, [returnToPreviousPageOrHome, surveyId]);

  const showToast = useCallback((message: string) => {
    setToastMessage(message);

    if (toastTimerRef.current) {
      clearTimeout(toastTimerRef.current);
    }

    toastTimerRef.current = setTimeout(() => setToastMessage(''), TOAST_DURATION);
  }, []);

  const saveLatestSurvey = useCallback(
    async ({ manual = false }: { manual?: boolean } = {}) => {
      if (publishedVersionRef.current) {
        return null;
      }

      const survey = latestSurveyRef.current;
      if (!survey) {
        return null;
      }

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
        saveTimerRef.current = null;
      }

      const requestId = ++requestSequenceRef.current;

      if (manual) {
        setPersistenceState({
          status: 'saving',
          message: `正在保存 v${survey.meta.version}...`
        });
        showToast('正在保存草稿...');
      }

      try {
        const response = await fetch(`/api/surveys/${surveyId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            document: survey
          })
        });

        if (!response.ok) {
          throw new Error('Survey save failed');
        }

        const payload = await response.json();

        if (requestId !== requestSequenceRef.current) {
          return null;
        }

        setPersistenceState({
          status: 'saved',
          message: `已保存 v${payload.version}`
        });

        if (manual) {
          showToast(`草稿已保存 v${payload.version}`);
        }

        return payload;
      } catch (error) {
        if (requestId !== requestSequenceRef.current) {
          return null;
        }

        setPersistenceState({
          status: 'error',
          message: error instanceof Error ? '保存失败，请稍后重试' : '保存失败'
        });

        if (manual) {
          showToast('保存失败，请稍后重试');
        }

        throw error;
      }
    },
    [showToast, surveyId]
  );

  const handleSurveyChange = useCallback(
    (survey: SurveyDocument) => {
      if (publishedVersionRef.current) {
        return;
      }

      latestSurveyRef.current = survey;
      setPersistenceState({
        status: 'saving',
        message: `正在保存 v${survey.meta.version}...`
      });
      setPublishState(
        createPublishState(
          publishedVersionRef.current,
          Boolean(publishedVersionRef.current && survey.meta.version > publishedVersionRef.current)
        )
      );

      if (saveTimerRef.current) {
        clearTimeout(saveTimerRef.current);
      }

      saveTimerRef.current = setTimeout(() => {
        void saveLatestSurvey();
      }, AUTOSAVE_DELAY);
    },
    [saveLatestSurvey]
  );

  const handleManualSave = useCallback(() => {
    void saveLatestSurvey({ manual: true });
  }, [saveLatestSurvey]);

  const handlePublish = useCallback(async () => {
    setPublishState((current) => ({
      ...current,
      status: 'publishing',
      message: '正在发布...'
    }));
    showToast('正在发布问卷...');

    try {
      await saveLatestSurvey();

      const response = await fetch(`/api/surveys/${surveyId}/publish`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Survey publish failed');
      }

      const payload = await response.json();
      publishedVersionRef.current = payload.version;
      setPublishState({
        status: 'published',
        message: '发布成功',
        publishedVersion: payload.version
      });
      showToast('发布成功，正在返回...');

      if (publishReturnTimerRef.current) {
        clearTimeout(publishReturnTimerRef.current);
      }
      publishReturnTimerRef.current = setTimeout(returnToPreviousPageOrHome, PUBLISH_SUCCESS_RETURN_DELAY);
    } catch (error) {
      setPublishState((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? '发布失败，请稍后重试' : '发布失败'
      }));
      showToast('发布失败，请稍后重试');
    }
  }, [returnToPreviousPageOrHome, saveLatestSurvey, showToast, surveyId]);

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
      onBack={returnToPreviousPageOrHome}
      onPublish={handlePublish}
      onSave={handleManualSave}
      onSurveyChange={handleSurveyChange}
      persistenceState={persistenceState}
      publishState={publishState}
      responseCount={responseCount}
      initialAiPrompt={initialAiPrompt}
      initialTemplateKey={initialTemplateKey}
      surveyId={surveyId}
      toastMessage={toastMessage}
    />
  );
}
