'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { EditorShell, type EditorPersistenceState, type EditorPublishState } from '@/components/editor/EditorShell';
import type { ResponseFeedState } from '@/components/editor/SurveyDeliveryPanel';
import type { SurveyResponseRecord } from '@/features/persistence/contracts';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { surveyDocumentSchema, type SurveyDocument } from '@/features/survey-schema/schema';

const AUTOSAVE_DELAY = 800;

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

export function EditorWorkspace({ surveyId }: { surveyId: string }) {
  const [initialSurvey, setInitialSurvey] = useState<SurveyDocument | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [persistenceState, setPersistenceState] = useState<EditorPersistenceState>({
    status: 'idle',
    message: '草稿尚未保存'
  });
  const [publishState, setPublishState] = useState<EditorPublishState>(createPublishState(null));
  const [responseCount, setResponseCount] = useState(0);
  const [recentResponses, setRecentResponses] = useState<SurveyResponseRecord[]>([]);
  const [responseFeedState, setResponseFeedState] = useState<ResponseFeedState>({
    status: 'idle',
    message: '发布后即可查看填写链接与最近答卷'
  });
  const latestSurveyRef = useRef<SurveyDocument | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestSequenceRef = useRef(0);
  const publishedVersionRef = useRef<number | null>(null);

  const loadResponses = useCallback(async () => {
    if (!publishedVersionRef.current) {
      setRecentResponses([]);
      setResponseFeedState({
        status: 'idle',
        message: '发布后即可查看填写链接与最近答卷'
      });
      return;
    }

    setResponseFeedState({
      status: 'loading',
      message: '正在刷新最近答卷...'
    });

    try {
      const response = await fetch(`/api/surveys/${surveyId}/responses`);

      if (!response.ok) {
        throw new Error('Survey responses load failed');
      }

      const payload = await response.json();
      const responses = Array.isArray(payload.responses) ? payload.responses : [];
      const nextResponseCount = typeof payload.responseCount === 'number' ? payload.responseCount : responses.length;

      setRecentResponses(responses);
      setResponseCount(nextResponseCount);
      setResponseFeedState({
        status: 'idle',
        message: nextResponseCount ? `已同步最近 ${responses.length} 条答卷` : '还没有收到答卷'
      });
    } catch (error) {
      setRecentResponses([]);
      setResponseFeedState({
        status: 'error',
        message: error instanceof Error ? '答卷加载失败，请稍后重试' : '答卷加载失败'
      });
    }
  }, [surveyId]);

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
          setRecentResponses([]);
          setResponseFeedState({
            status: 'idle',
            message: '发布后即可查看填写链接与最近答卷'
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
        publishedVersionRef.current =
          typeof payload.published?.version === 'number' ? payload.published.version : null;
        setPersistenceState({
          status: 'saved',
          message: '草稿已加载'
        });
        setPublishState(
          createPublishState(
            publishedVersionRef.current,
            Boolean(publishedVersionRef.current && document.meta.version > publishedVersionRef.current)
          )
        );
        setResponseCount(typeof payload.responseCount === 'number' ? payload.responseCount : 0);

        if (publishedVersionRef.current) {
          void loadResponses();
        } else {
          setRecentResponses([]);
          setResponseFeedState({
            status: 'idle',
            message: '发布后即可查看填写链接与最近答卷'
          });
        }
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
        setRecentResponses([]);
        setResponseFeedState({
          status: 'error',
          message: '答卷面板暂时不可用'
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
  }, [loadResponses, surveyId]);

  const handleSurveyChange = useCallback(
    (survey: SurveyDocument) => {
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

  const handlePublish = useCallback(async () => {
    setPublishState((current) => ({
      ...current,
      status: 'publishing',
      message: '正在发布...'
    }));

    try {
      if (latestSurveyRef.current) {
        const saveResponse = await fetch(`/api/surveys/${surveyId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            document: latestSurveyRef.current
          })
        });

        if (!saveResponse.ok) {
          throw new Error('Survey save before publish failed');
        }

        const savedPayload = await saveResponse.json();
        setPersistenceState({
          status: 'saved',
          message: `已保存 v${savedPayload.version}`
        });
      }

      const response = await fetch(`/api/surveys/${surveyId}/publish`, {
        method: 'POST'
      });

      if (!response.ok) {
        throw new Error('Survey publish failed');
      }

      const payload = await response.json();
      publishedVersionRef.current = payload.version;
      setPublishState(createPublishState(payload.version));
      await loadResponses();
    } catch (error) {
      setPublishState((current) => ({
        ...current,
        status: 'error',
        message: error instanceof Error ? '发布失败，请稍后重试' : '发布失败'
      }));
    }
  }, [surveyId]);

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
      onPublish={handlePublish}
      onRefreshResponses={loadResponses}
      recentResponses={recentResponses}
      responseFeedState={responseFeedState}
      onSurveyChange={handleSurveyChange}
      persistenceState={persistenceState}
      publishState={publishState}
      responseCount={responseCount}
      surveyId={surveyId}
    />
  );
}
