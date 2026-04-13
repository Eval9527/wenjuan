import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PublishedSurveyPage } from '@/components/published/PublishedSurveyPage';

describe('PublishedSurveyPage', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders survey content and submits with Chinese actions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response(
        JSON.stringify({
          responseId: 'resp-1',
          responseCount: 1,
          submittedAt: '2026-04-13T00:00:00.000Z'
        }),
        { status: 200 }
      )
    );

    render(
      <PublishedSurveyPage
        document={{
          id: 'demo',
          title: '活动报名表',
          blocks: [
            {
              id: 'title-1',
              type: 'title',
              label: '活动报名表',
              level: 1
            },
            {
              id: 'input-1',
              type: 'input',
              label: '手机号',
              placeholder: '请输入手机号'
            }
          ],
          settings: { submitLabel: '提交问卷' },
          meta: {
            version: 2,
            createdAt: '2026-04-13T00:00:00.000Z',
            updatedAt: '2026-04-13T00:00:00.000Z'
          }
        }}
        surveyId="demo"
      />
    );

    expect(screen.getByRole('link', { name: '返回编辑器' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '提交问卷' })).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText('手机号'), {
      target: { value: '13800138000' }
    });
    fireEvent.click(screen.getByRole('button', { name: '提交问卷' }));

    const successSection = (await screen.findByText('提交成功，感谢填写')).closest('section');

    expect(successSection).not.toBeNull();
    expect(screen.getByText('已累计收到 1 份答卷。')).toBeInTheDocument();
    expect(within(successSection as HTMLElement).getByRole('link', { name: '返回工作台' })).toBeInTheDocument();
    expect(within(successSection as HTMLElement).getByRole('link', { name: '返回编辑器' })).toBeInTheDocument();
    expect(within(successSection as HTMLElement).getByRole('button', { name: '再填写一份' })).toBeInTheDocument();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/surveys/demo/responses',
      expect.objectContaining({
        method: 'POST',
        body: JSON.stringify({
          answers: {
            'input-1': '13800138000'
          }
        })
      })
    );
  });
});
