import { describe, expect, it } from 'vitest';
import { createEmptySurvey } from '@/features/survey-schema/factories';
import { surveyDocumentSchema } from '@/features/survey-schema/schema';

describe('survey schema', () => {
  it('accepts a minimal survey document', () => {
    const survey = createEmptySurvey({ id: 'demo' });

    expect(() => surveyDocumentSchema.parse(survey)).not.toThrow();
  });

  it('rejects a single choice block without options', () => {
    expect(() =>
      surveyDocumentSchema.parse({
        id: 'demo',
        title: 'Demo',
        blocks: [
          {
            id: 'b1',
            type: 'singleChoice',
            label: '满意度',
            options: []
          }
        ],
        settings: { submitLabel: '提交' },
        meta: {
          version: 1,
          createdAt: '2026-04-13T00:00:00.000Z',
          updatedAt: '2026-04-13T00:00:00.000Z'
        }
      })
    ).toThrow();
  });
});
