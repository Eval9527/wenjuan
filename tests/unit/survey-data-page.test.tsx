import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import SurveyDataPage from '@/app/surveys/[surveyId]/data/page';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { publishSurveyDraft, saveSurveyDraft, submitSurveyResponse } from '@/features/persistence/repository';

describe('SurveyDataPage', () => {
  let dataDir: string;

  beforeEach(async () => {
    dataDir = await mkdtemp(path.join(tmpdir(), 'wenjuan-data-page-'));
    process.env.WENJUAN_DATA_DIR = dataDir;
  });

  afterEach(async () => {
    delete process.env.WENJUAN_DATA_DIR;
    await rm(dataDir, { force: true, recursive: true });
  });

  it('renders visualized response data for every answerable question', async () => {
    const survey = {
      ...createEmptySurvey({ id: 'demo' }),
      title: '睡眠质量调查',
      blocks: [
        { id: 'title-1', type: 'title' as const, label: '睡眠质量调查', level: 1 },
        { id: 'input-1', type: 'input' as const, label: '每天睡多久', placeholder: '例如 7 小时' },
        {
          id: 'single-1',
          type: 'singleChoice' as const,
          label: '整体睡眠质量',
          options: [
            { id: 'good', text: '很好' },
            { id: 'normal', text: '一般' }
          ]
        },
        {
          id: 'multi-1',
          type: 'multiChoice' as const,
          label: '影响睡眠的因素',
          options: [
            { id: 'work', text: '工作压力' },
            { id: 'phone', text: '睡前刷手机' }
          ]
        }
      ]
    };

    await saveSurveyDraft({
      surveyId: 'demo',
      version: 1,
      document: survey
    });
    await publishSurveyDraft('demo');
    await submitSurveyResponse('demo', {
      'input-1': '7 小时',
      'single-1': '一般',
      'multi-1': ['工作压力', '睡前刷手机']
    });
    await submitSurveyResponse('demo', {
      'input-1': '6 小时',
      'single-1': '很好',
      'multi-1': ['工作压力']
    });

    render(
      await SurveyDataPage({
        params: Promise.resolve({ surveyId: 'demo' })
      })
    );

    expect(screen.getByRole('heading', { name: '睡眠质量调查' })).toBeInTheDocument();
    expect(screen.getByText('共 2 份答卷')).toBeInTheDocument();
    expect(screen.getByText('每天睡多久')).toBeInTheDocument();
    expect(screen.getByText('7 小时')).toBeInTheDocument();
    expect(screen.getByText('6 小时')).toBeInTheDocument();

    const qualityCard = screen.getByText('整体睡眠质量').closest('section');
    expect(qualityCard).not.toBeNull();
    expect(within(qualityCard as HTMLElement).getByText('很好')).toBeInTheDocument();
    expect(within(qualityCard as HTMLElement).getByText('一般')).toBeInTheDocument();
    expect(within(qualityCard as HTMLElement).getAllByText('50%')).toHaveLength(2);

    const factorsCard = screen.getByText('影响睡眠的因素').closest('section');
    expect(factorsCard).not.toBeNull();
    expect(within(factorsCard as HTMLElement).getByText('工作压力')).toBeInTheDocument();
    expect(within(factorsCard as HTMLElement).getByText('100%')).toBeInTheDocument();
    expect(screen.getByText('最近提交数据')).toBeInTheDocument();
  });
});
