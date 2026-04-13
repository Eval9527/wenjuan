import { describe, expect, it } from 'vitest';
import { aiDraftChangeSetSchema } from '@/features/ai-assistant/types';

describe('aiDraftChangeSetSchema', () => {
  it('accepts an addBlock preview payload', () => {
    expect(() =>
      aiDraftChangeSetSchema.parse({
        id: 'change-1',
        basedOnVersion: 1,
        userIntent: '增加一个联系方式填写框',
        summary: '新增 1 个填写题',
        operations: [
          {
            type: 'addBlock',
            block: {
              id: 'b1',
              type: 'input',
              label: '联系方式',
              placeholder: '请输入联系方式'
            }
          }
        ],
        nextDocument: {
          id: 'demo',
          title: 'Demo',
          blocks: [
            {
              id: 'b1',
              type: 'input',
              label: '联系方式',
              placeholder: '请输入联系方式'
            }
          ],
          settings: { submitLabel: '提交' },
          meta: {
            version: 2,
            createdAt: '2026-04-13T00:00:00.000Z',
            updatedAt: '2026-04-13T00:00:00.000Z'
          }
        }
      })
    ).not.toThrow();
  });
});
