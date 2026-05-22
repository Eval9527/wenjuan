import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useSqlTestDatabase } from '../helpers/sql-test-db';

const submittedCookieValues = vi.hoisted(() => new Map<string, string>());

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = submittedCookieValues.get(name);
      return value === undefined ? undefined : { name, value };
    }
  }))
}));

import FillSurveyPage from '@/app/f/[surveyId]/page';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { publishSurveyDraft, saveSurveyDraft } from '@/features/persistence/repository';

describe('FillSurveyPage', () => {
  useSqlTestDatabase();

  beforeEach(() => {
    submittedCookieValues.clear();
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

    expect(screen.getByText('问卷暂未开放填写')).toBeInTheDocument();
    expect(screen.getByText('请稍后再试，或联系问卷发起人确认填写时间。')).toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '返回编辑器' })).not.toBeInTheDocument();
    expect(screen.queryByRole('link', { name: '返回工作台' })).not.toBeInTheDocument();
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

  it('shows the submitted success state when the local cookie is present', async () => {
    const survey = {
      ...createEmptySurvey({ id: 'demo' }),
      title: '活动报名表',
      blocks: [{ id: 'title-1', type: 'title' as const, label: '活动报名表', level: 1 }]
    };

    await saveSurveyDraft({
      surveyId: 'demo',
      version: 1,
      document: survey
    });
    await publishSurveyDraft('demo');
    submittedCookieValues.set('wenjuan_submitted_demo', '1');

    render(
      await FillSurveyPage({
        params: Promise.resolve({ surveyId: 'demo' })
      })
    );

    expect(screen.getByText('提交成功，感谢填写')).toBeInTheDocument();
    expect(screen.getByText('您的答卷已成功记录。')).toBeInTheDocument();
    expect(screen.queryByTestId('published-survey-form')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '再填写一份' })).not.toBeInTheDocument();
  });
});
