import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PublishedSurveyPage } from '@/components/published/PublishedSurveyPage';

describe('PublishedSurveyPage', () => {
  it('renders survey content and submits with Chinese actions', () => {
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

    fireEvent.click(screen.getByRole('button', { name: '提交问卷' }));

    expect(screen.getByText('提交成功，感谢填写')).toBeInTheDocument();
  });
});
