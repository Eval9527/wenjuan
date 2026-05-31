import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HomePage from '@/app/page';
import SurveysPage from '@/app/surveys/page';
import FillSurveyPage from '@/app/f/[surveyId]/page';
import SurveyDataPage from '@/app/surveys/[surveyId]/data/page';
import { GET as getSurveys } from '@/app/api/surveys/route';
import { GET as getSurvey } from '@/app/api/surveys/[surveyId]/route';
import { resetSqlClientForTests, setSqlPoolForTests } from '@/features/persistence/sql-client';

function installUnavailableDatabase(message = 'database "postgres" does not exist') {
  setSqlPoolForTests({
    query: vi.fn().mockRejectedValue(new Error(message)),
    end: vi.fn().mockResolvedValue(undefined)
  });
}

describe('database unavailable fallback', () => {
  beforeEach(() => {
    installUnavailableDatabase();
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    await resetSqlClientForTests();
  });

  it('keeps the homepage renderable with a friendly service notice', async () => {
    render(await HomePage({} as never));

    expect(screen.getByRole('heading', { name: '演示数据库暂时不可用' })).toBeInTheDocument();
    expect(screen.getByText(/当前无法读取问卷数据/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '刷新重试' })).toHaveAttribute('href', '/');
    expect(screen.getByRole('link', { name: '查看功能展示' })).toHaveAttribute('href', '/showcase');
  });

  it('keeps the survey center renderable with the same friendly notice', async () => {
    render(await SurveysPage({} as never));

    expect(screen.getByRole('heading', { name: '演示数据库暂时不可用' })).toBeInTheDocument();
    expect(screen.getByText(/可能正在恢复或需要重新初始化/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '返回工作台' })).toHaveAttribute('href', '/');
  });

  it('keeps public fill and data pages from surfacing a server exception digest', async () => {
    const params = Promise.resolve({ surveyId: 'demo' });
    const fillRender = render(await FillSurveyPage({ params }));

    expect(screen.getByRole('heading', { name: '问卷暂时无法访问' })).toBeInTheDocument();
    expect(screen.getByText(/请稍后再试或联系问卷发布者/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '刷新重试' })).toHaveAttribute('href', '/f/demo');
    expect(screen.queryByRole('link', { name: '查看功能展示' })).not.toBeInTheDocument();

    fillRender.unmount();

    render(
      await SurveyDataPage({
        params: Promise.resolve({ surveyId: 'demo' })
      })
    );

    expect(screen.getByRole('heading', { name: '无法加载分析数据' })).toBeInTheDocument();
    expect(screen.getByText(/请检查 DATABASE_URL/)).toBeInTheDocument();
    expect(screen.getByRole('link', { name: '刷新重试' })).toHaveAttribute('href', '/surveys/demo/data');
  });

  it('returns a 503 JSON response for survey APIs instead of throwing', async () => {
    const listResponse = await getSurveys();
    const listPayload = await listResponse.json();

    expect(listResponse.status).toBe(503);
    expect(listPayload).toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
      error: '演示数据库暂时不可用'
    });

    const detailResponse = await getSurvey(new Request('http://localhost/api/surveys/demo'), {
      params: Promise.resolve({ surveyId: 'demo' })
    });
    const detailPayload = await detailResponse.json();

    expect(detailResponse.status).toBe(503);
    expect(detailPayload).toMatchObject({
      code: 'DATABASE_UNAVAILABLE',
      error: '演示数据库暂时不可用'
    });
  });
});
