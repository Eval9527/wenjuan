import { describe, expect, it } from 'vitest';
import { buildSurveyResponseAnalytics } from '@/features/responses/analytics';
import type { SurveyDocument } from '@/features/survey-schema/schema';
import type { SurveyResponseRecord } from '@/features/persistence/contracts';

function createDocument(): SurveyDocument {
  return {
    id: 'demo',
    title: '睡眠质量调查',
    blocks: [
      { id: 'title-1', type: 'title', label: '睡眠质量调查', level: 1 },
      { id: 'input-1', type: 'input', label: '每天睡多久', placeholder: '例如 7 小时' },
      {
        id: 'single-1',
        type: 'singleChoice',
        label: '整体睡眠质量',
        options: [
          { id: 'good', text: '很好' },
          { id: 'normal', text: '一般' },
          { id: 'bad', text: '较差' }
        ]
      },
      {
        id: 'multi-1',
        type: 'multiChoice',
        label: '影响睡眠的因素',
        options: [
          { id: 'work', text: '工作压力' },
          { id: 'phone', text: '睡前刷手机' },
          { id: 'noise', text: '环境噪音' }
        ]
      }
    ],
    settings: { submitLabel: '提交' },
    meta: {
      version: 1,
      createdAt: '2026-04-13T00:00:00.000Z',
      updatedAt: '2026-04-13T00:00:00.000Z'
    }
  };
}

function createResponses(): SurveyResponseRecord[] {
  return [
    {
      id: 'resp-1',
      surveyId: 'demo',
      version: 1,
      submittedAt: '2026-04-13T10:00:00.000Z',
      answers: {
        'input-1': '7 小时',
        'single-1': '一般',
        'multi-1': ['工作压力', '睡前刷手机']
      }
    },
    {
      id: 'resp-2',
      surveyId: 'demo',
      version: 1,
      submittedAt: '2026-04-13T11:00:00.000Z',
      answers: {
        'input-1': '6 小时',
        'single-1': '较差',
        'multi-1': ['工作压力']
      }
    }
  ];
}

describe('buildSurveyResponseAnalytics', () => {
  it('summarizes input answers and choice percentages per question', () => {
    const analytics = buildSurveyResponseAnalytics(createDocument(), createResponses());

    expect(analytics.responseCount).toBe(2);
    expect(analytics.questions).toHaveLength(3);
    expect(analytics.questions[0]).toMatchObject({
      blockId: 'input-1',
      type: 'input',
      label: '每天睡多久',
      answers: ['7 小时', '6 小时']
    });
    expect(analytics.questions[1]).toMatchObject({
      blockId: 'single-1',
      type: 'singleChoice',
      label: '整体睡眠质量',
      options: [
        { label: '很好', count: 0, percentage: 0 },
        { label: '一般', count: 1, percentage: 50 },
        { label: '较差', count: 1, percentage: 50 }
      ]
    });
    expect(analytics.questions[2]).toMatchObject({
      blockId: 'multi-1',
      type: 'multiChoice',
      label: '影响睡眠的因素',
      options: [
        { label: '工作压力', count: 2, percentage: 100 },
        { label: '睡前刷手机', count: 1, percentage: 50 },
        { label: '环境噪音', count: 0, percentage: 0 }
      ]
    });
  });
});
