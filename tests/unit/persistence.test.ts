import { describe, expect, it } from 'vitest';
import { useSqlTestDatabase } from '../helpers/sql-test-db';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import {
  getPublishedSurvey,
  getLatestSurveyDraft,
  listSurveyDrafts,
  listSurveyResponses,
  publishSurveyDraft,
  submitSurveyResponse,
  saveSurveyDraft
} from '@/features/persistence/repository';

describe('survey repository', () => {
  useSqlTestDatabase();


  it('persists a survey draft version', async () => {
    const document = createEmptySurvey({ id: 'demo' });

    const saved = await saveSurveyDraft({
      surveyId: 'demo',
      version: 1,
      document
    });

    expect(saved.version).toBe(1);

    const latest = await getLatestSurveyDraft('demo');

    expect(latest?.version).toBe(1);
    expect(latest?.document).toEqual(document);
  });

  it('returns the latest draft and survey summaries', async () => {
    const initial = createEmptySurvey({ id: 'demo' });
    const updated = {
      ...initial,
      title: '活动报名表',
      meta: {
        ...initial.meta,
        version: 2
      }
    };

    await saveSurveyDraft({
      surveyId: 'demo',
      version: 1,
      document: initial
    });
    await saveSurveyDraft({
      surveyId: 'demo',
      version: 2,
      document: updated
    });

    const latest = await getLatestSurveyDraft('demo');
    const surveys = await listSurveyDrafts();

    expect(latest?.version).toBe(2);
    expect(latest?.document.title).toBe('活动报名表');
    expect(surveys).toEqual([
      expect.objectContaining({
        surveyId: 'demo',
        title: '活动报名表',
        currentVersion: 2
      })
    ]);
  });

  it('publishes a snapshot and keeps the public version stable until republish', async () => {
    const initial = createEmptySurvey({ id: 'demo' });
    const updated = {
      ...initial,
      title: '活动报名表',
      meta: {
        ...initial.meta,
        version: 2
      }
    };

    await saveSurveyDraft({
      surveyId: 'demo',
      version: 1,
      document: initial
    });

    const firstPublish = await publishSurveyDraft('demo');
    expect(firstPublish.version).toBe(1);
    expect((await getPublishedSurvey('demo'))?.document.title).toBe('未命名问卷');

    await saveSurveyDraft({
      surveyId: 'demo',
      version: 2,
      document: updated
    });

    expect((await getLatestSurveyDraft('demo'))?.version).toBe(2);
    expect((await getPublishedSurvey('demo'))?.version).toBe(1);

    const secondPublish = await publishSurveyDraft('demo');
    const surveys = await listSurveyDrafts();

    expect(secondPublish.version).toBe(2);
    expect((await getPublishedSurvey('demo'))?.document.title).toBe('活动报名表');
    expect(surveys).toEqual([
      expect.objectContaining({
        surveyId: 'demo',
        currentVersion: 2,
        publishedVersion: 2
      })
    ]);
  });

  it('stores submitted responses for published surveys and exposes response count', async () => {
    const survey = {
      ...createEmptySurvey({ id: 'demo' }),
      title: '活动报名表',
      blocks: [
        { id: 'title-1', type: 'title' as const, label: '活动报名表', level: 1 },
        { id: 'input-1', type: 'input' as const, label: '姓名', placeholder: '请输入姓名' }
      ]
    };

    await saveSurveyDraft({
      surveyId: 'demo',
      version: 1,
      document: survey
    });
    await publishSurveyDraft('demo');

    const response = await submitSurveyResponse('demo', {
      'input-1': '张三'
    });

    const responses = await listSurveyResponses('demo');
    const surveys = await listSurveyDrafts();

    expect(response.answers).toEqual({
      'input-1': '张三'
    });
    expect(response.version).toBe(1);
    expect(responses).toHaveLength(1);
    expect(responses[0]?.answers).toEqual({
      'input-1': '张三'
    });
    expect(surveys).toEqual([
      expect.objectContaining({
        surveyId: 'demo',
        responseCount: 1
      })
    ]);
  });
});
