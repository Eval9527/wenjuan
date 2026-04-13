import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import {
  getPublishedSurvey,
  getLatestSurveyDraft,
  listSurveyDrafts,
  publishSurveyDraft,
  saveSurveyDraft
} from '@/features/persistence/repository';

describe('survey repository', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'wenjuan-repo-'));
    process.env.WENJUAN_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    delete process.env.WENJUAN_DATA_DIR;
    await rm(dataDir, { force: true, recursive: true });
  });

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
});
