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
    const publishedWithoutResponses = {
      ...createEmptySurvey({ id: 'published-empty' }),
      title: '公开填写问卷'
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
      surveyId: 'published-empty',
      version: publishedWithoutResponses.meta.version,
      document: publishedWithoutResponses
    });
    await publishSurveyDraft('published-empty');
    await saveSurveyDraft({
      surveyId: 'draft-only',
      version: draftOnlySurvey.meta.version,
      document: draftOnlySurvey
    });

    render(await HomePage({} as never));

    const totalCard = screen.getByText('全部问卷').closest('a');
    const publishedCardSummary = screen.getByText('已发布').closest('a');
    const responsesCard = screen.getByText('累计答卷').closest('a');

    expect(totalCard).not.toBeNull();
    expect(publishedCardSummary).not.toBeNull();
    expect(responsesCard).not.toBeNull();
    expect(totalCard).toHaveAttribute('href', '/surveys');
    expect(publishedCardSummary).toHaveAttribute('href', '/surveys?status=published');
    expect(responsesCard).toHaveAttribute('href', '/surveys?status=responded');
    expect(within(totalCard as HTMLElement).getByText('3')).toBeInTheDocument();
    expect(within(publishedCardSummary as HTMLElement).getByText('2')).toBeInTheDocument();
    expect(within(responsesCard as HTMLElement).getByText('1')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: '生成问卷' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/打工人睡眠质量/)).not.toBeRequired();
    expect(screen.getByText('活动报名表')).toBeInTheDocument();
    expect(screen.getByText('已锁定 · v1')).toBeInTheDocument();
    expect(screen.getByText('答卷: 1 份')).toBeInTheDocument();

    const publishedCard = screen.getByText('活动报名表').closest('article');
    expect(publishedCard).not.toBeNull();
    expect(within(publishedCard as HTMLElement).queryByRole('link', { name: '继续编辑' })).not.toBeInTheDocument();
    expect(within(publishedCard as HTMLElement).getByRole('link', { name: '查看问卷数据' })).toHaveAttribute('href', '/surveys/demo/data');
    expect(within(publishedCard as HTMLElement).queryByRole('link', { name: '查看填写页' })).not.toBeInTheDocument();
    expect(within(publishedCard as HTMLElement).getByRole('button', { name: '复制问卷' })).toBeInTheDocument();
    expect(within(publishedCard as HTMLElement).getByRole('link', { name: '填写页' })).toHaveAttribute('href', '/f/demo');
    expect(within(publishedCard as HTMLElement).queryByRole('button', { name: '复制填写链接' })).not.toBeInTheDocument();
    expect(writeText).not.toHaveBeenCalled();

    const draftOnlyCard = screen.getByText('内部预览问卷').closest('article');
    expect(draftOnlyCard).not.toBeNull();
    expect(within(draftOnlyCard as HTMLElement).queryByRole('link', { name: '填写页' })).not.toBeInTheDocument();

    const publishedWithoutResponsesCard = screen.getByText('公开填写问卷').closest('article');
    expect(publishedWithoutResponsesCard).not.toBeNull();
    expect(within(publishedWithoutResponsesCard as HTMLElement).getByRole('link', { name: '查看填写页' })).toHaveAttribute('href', '/f/published-empty');
    expect(within(publishedWithoutResponsesCard as HTMLElement).queryByRole('link', { name: '填写页' })).not.toBeInTheDocument();

    expect(screen.getByRole('link', { name: '空白开始' })).toHaveAttribute('href', '/new');
    expect(screen.getByRole('link', { name: '活动报名模板' })).toHaveAttribute('href', '/new?template=event-signup');
    expect(screen.getByRole('link', { name: '满意度回访模板' })).toHaveAttribute('href', '/new?template=satisfaction');
    expect(screen.getByRole('link', { name: '线索收集模板' })).toHaveAttribute('href', '/new?template=lead-collection');
    expect(screen.getByRole('link', { name: '睡眠质量模板' })).toHaveAttribute('href', '/new?template=worker-sleep');
  });

  it('shows only the latest 5 surveys by default and sends view all to survey center', async () => {
    for (let index = 1; index <= 6; index += 1) {
      await saveSurveyDraft({
        surveyId: `survey-${index}`,
        version: 1,
        document: {
          ...createEmptySurvey({ id: `survey-${index}` }),
          title: `问卷 ${index}`
        }
      });
      await new Promise((resolve) => setTimeout(resolve, 2));
    }

    const firstRender = render(await HomePage({} as never));

    expect(screen.queryByText('问卷 1')).not.toBeInTheDocument();
    expect(screen.getByText('问卷 2')).toBeInTheDocument();
    expect(screen.getByText('问卷 6')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '查看全部' })).toHaveAttribute('href', '/surveys');

    firstRender.unmount();
  });
});
