import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useSqlTestDatabase } from '../helpers/sql-test-db';
import SurveysPage from '@/app/surveys/page';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { publishSurveyDraft, saveSurveyDraft, submitSurveyResponse } from '@/features/persistence/repository';

describe('SurveysPage', () => {
  useSqlTestDatabase();


  it('renders one clickable stats area as filters and paginates survey cards', async () => {
    for (let index = 1; index <= 12; index += 1) {
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

    render(await SurveysPage({} as never));

    expect(screen.getByRole('heading', { name: '问卷中心' })).toBeInTheDocument();
    expect(screen.getByText('集中管理草稿、已发布问卷和答卷数据。')).toBeInTheDocument();
    expect(screen.queryByText(/首页继续保留 AI-first 生成入口/)).not.toBeInTheDocument();
    expect(screen.getByRole('link', { name: '首页' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '返回首页' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '新建问卷' })).toHaveAttribute('href', '/new');

    const stats = screen.getByLabelText('问卷筛选与统计');
    expect(within(stats).getByRole('link', { name: /全部问卷 12/ })).toHaveAttribute('href', '/surveys');
    expect(within(stats).getByRole('link', { name: /已发布 0/ })).toHaveAttribute('href', '/surveys?status=published');
    expect(within(stats).getByRole('link', { name: /草稿 12/ })).toHaveAttribute('href', '/surveys?status=draft');
    expect(within(stats).getByRole('link', { name: /有答卷 0/ })).toHaveAttribute('href', '/surveys?status=responded');
    expect(screen.queryByLabelText('问卷筛选')).not.toBeInTheDocument();

    expect(screen.queryByText('问卷 1')).not.toBeInTheDocument();
    expect(screen.queryByText('问卷 2')).not.toBeInTheDocument();
    expect(screen.getByText('问卷 3')).toBeInTheDocument();
    expect(screen.getByText('问卷 12')).toBeInTheDocument();
    expect(screen.getByText('第 1 / 2 页')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '下一页' })).toHaveAttribute('href', '/surveys?page=2');
    expect(screen.queryByText(/Survey ID/i)).not.toBeInTheDocument();
  });

  it('renders the second page while preserving pagination state', async () => {
    for (let index = 1; index <= 12; index += 1) {
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

    render(
      await SurveysPage({
        searchParams: Promise.resolve({ page: '2' })
      } as never)
    );

    expect(screen.getByText('问卷 1')).toBeInTheDocument();
    expect(screen.getByText('问卷 2')).toBeInTheDocument();
    expect(screen.queryByText('问卷 3')).not.toBeInTheDocument();
    expect(screen.getByText('第 2 / 2 页')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '上一页' })).toHaveAttribute('href', '/surveys');
  });

  it('filters to responded surveys and exposes the data page action', async () => {
    const draft = {
      ...createEmptySurvey({ id: 'draft-only' }),
      title: '草稿问卷'
    };
    const responded = {
      ...createEmptySurvey({ id: 'responded' }),
      title: '客户满意度回访'
    };

    await saveSurveyDraft({
      surveyId: 'draft-only',
      version: draft.meta.version,
      document: draft
    });
    await saveSurveyDraft({
      surveyId: 'responded',
      version: responded.meta.version,
      document: responded
    });
    await publishSurveyDraft('responded');
    await submitSurveyResponse('responded', {
      score: '满意'
    });

    render(
      await SurveysPage({
        searchParams: Promise.resolve({ status: 'responded' })
      } as never)
    );

    expect(screen.getByText('客户满意度回访')).toBeInTheDocument();
    expect(screen.queryByText('草稿问卷')).not.toBeInTheDocument();

    const card = screen.getByText('客户满意度回访').closest('article');
    expect(card).not.toBeNull();
    expect(within(card as HTMLElement).getByTestId('survey-card-actions')).toHaveClass('survey-card-actions--triple');
    expect(within(card as HTMLElement).queryByRole('button', { name: '复制填写链接' })).not.toBeInTheDocument();
    expect(within(card as HTMLElement).getByRole('link', { name: '查看问卷数据' })).toHaveAttribute(
      'href',
      '/surveys/responded/data'
    );
  });
});
