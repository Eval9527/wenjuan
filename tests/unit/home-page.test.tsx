import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import HomePage from '@/app/page';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { publishSurveyDraft, saveSurveyDraft, submitSurveyResponse } from '@/features/persistence/repository';

describe('HomePage', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'wenjuan-home-'));
    process.env.WENJUAN_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    delete process.env.WENJUAN_DATA_DIR;
    await rm(dataDir, { force: true, recursive: true });
  });

  it('shows recent surveys with Chinese action buttons', async () => {
    const survey = {
      ...createEmptySurvey({ id: 'demo' }),
      title: '活动报名表'
    };

    await saveSurveyDraft({
      surveyId: 'demo',
      version: survey.meta.version,
      document: survey
    });
    await publishSurveyDraft('demo');
    await submitSurveyResponse('demo', {
      demo: 'ok'
    });

    render(await HomePage());

    expect(screen.getByRole('link', { name: '新建问卷' })).toBeInTheDocument();
    expect(screen.getByText('活动报名表')).toBeInTheDocument();
    expect(screen.getByText('已发布 v1')).toBeInTheDocument();
    expect(screen.getByText('已收集 1 份答卷')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '继续编辑' })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '填写页面' })).toBeInTheDocument();
  });
});
