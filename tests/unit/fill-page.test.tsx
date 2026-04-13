import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import FillSurveyPage from '@/app/f/[surveyId]/page';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { publishSurveyDraft, saveSurveyDraft } from '@/features/persistence/repository';

describe('FillSurveyPage', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'wenjuan-fill-'));
    process.env.WENJUAN_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    delete process.env.WENJUAN_DATA_DIR;
    await rm(dataDir, { force: true, recursive: true });
  });

  it('shows an unpublished message before the survey is published', async () => {
    const survey = createEmptySurvey({ id: 'demo' });

    await saveSurveyDraft({
      surveyId: 'demo',
      version: 1,
      document: survey
    });

    render(
      await FillSurveyPage({
        params: Promise.resolve({ surveyId: 'demo' })
      })
    );

    expect(screen.getByText('问卷尚未发布')).toBeInTheDocument();
  });

  it('renders the published snapshot instead of newer unpublished drafts', async () => {
    const initial = {
      ...createEmptySurvey({ id: 'demo' }),
      title: '活动报名表',
      blocks: [{ id: 'title-1', type: 'title' as const, label: '活动报名表', level: 1 }]
    };
    const updated = {
      ...initial,
      title: '新版活动报名表',
      blocks: [{ id: 'title-1', type: 'title' as const, label: '新版活动报名表', level: 1 }],
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
    await publishSurveyDraft('demo');
    await saveSurveyDraft({
      surveyId: 'demo',
      version: 2,
      document: updated
    });

    render(
      await FillSurveyPage({
        params: Promise.resolve({ surveyId: 'demo' })
      })
    );

    expect(screen.getByRole('heading', { name: '活动报名表' })).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: '新版活动报名表' })).not.toBeInTheDocument();
  });
});
