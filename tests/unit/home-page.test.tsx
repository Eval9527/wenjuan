import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
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

  it('shows dashboard stats and share actions for recent surveys', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true
    });

    const survey = {
      ...createEmptySurvey({ id: 'demo' }),
      title: '活动报名表'
    };
    const draftOnlySurvey = {
      ...createEmptySurvey({ id: 'draft-only' }),
      title: '内部预览问卷'
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
    await saveSurveyDraft({
      surveyId: 'draft-only',
      version: draftOnlySurvey.meta.version,
      document: draftOnlySurvey
    });

    render(await HomePage());

    const totalCard = screen.getByText('问卷总数').closest('article');
    const publishedCardSummary = screen.getByText('已发布').closest('article');
    const responsesCard = screen.getByText('累计答卷').closest('article');

    expect(totalCard).not.toBeNull();
    expect(publishedCardSummary).not.toBeNull();
    expect(responsesCard).not.toBeNull();
    expect(within(totalCard as HTMLElement).getByText('2')).toBeInTheDocument();
    expect(within(publishedCardSummary as HTMLElement).getByText('1')).toBeInTheDocument();
    expect(within(responsesCard as HTMLElement).getByText('1')).toBeInTheDocument();

    expect(screen.getByRole('link', { name: '新建问卷' })).toBeInTheDocument();
    expect(screen.getByText('活动报名表')).toBeInTheDocument();
    expect(screen.getByText('已发布 v1')).toBeInTheDocument();
    expect(screen.getByText('已收集 1 份答卷')).toBeInTheDocument();

    const publishedCard = screen.getByText('活动报名表').closest('article');
    expect(publishedCard).not.toBeNull();
    expect(within(publishedCard as HTMLElement).getByRole('link', { name: '继续编辑' })).toBeInTheDocument();
    expect(within(publishedCard as HTMLElement).getByRole('link', { name: '填写页面' })).toBeInTheDocument();
    fireEvent.click(within(publishedCard as HTMLElement).getByRole('button', { name: '复制填写链接' }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledWith(expect.stringMatching(/\/f\/demo$/));
    });

    expect(within(publishedCard as HTMLElement).getByText('链接已复制')).toBeInTheDocument();

    const draftOnlyCard = screen.getByText('内部预览问卷').closest('article');
    expect(draftOnlyCard).not.toBeNull();
    expect(within(draftOnlyCard as HTMLElement).getByText('待发布后可分享')).toBeInTheDocument();
  });
});
