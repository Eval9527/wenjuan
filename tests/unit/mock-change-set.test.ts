import { describe, expect, it } from 'vitest';
import { buildMockChangeSet } from '@/features/ai-assistant/mock-change-set';
import type { SurveyDocument } from '@/features/survey-schema/schema';

function createBaseDocument(): SurveyDocument {
  return {
    id: 'demo',
    title: '原始问卷',
    blocks: [
      {
        id: 'title-1',
        type: 'title',
        label: '原始标题',
        level: 1
      },
      {
        id: 'single-1',
        type: 'singleChoice',
        label: '你喜欢这个产品吗？',
        options: [
          { id: 'o1', text: '喜欢' },
          { id: 'o2', text: '一般' }
        ]
      }
    ],
    settings: { submitLabel: '提交' },
    meta: {
      version: 3,
      createdAt: '2026-04-13T00:00:00.000Z',
      updatedAt: '2026-04-13T00:00:00.000Z'
    }
  };
}

describe('buildMockChangeSet', () => {
  it('adds an input block when the prompt asks for contact info', () => {
    const changeSet = buildMockChangeSet('增加一个手机号填写框', createBaseDocument());

    expect(changeSet.operations).toHaveLength(1);
    expect(changeSet.operations[0]).toMatchObject({
      type: 'addBlock',
      block: {
        type: 'input',
        label: '手机号'
      }
    });
    expect(changeSet.nextDocument.blocks.at(-1)).toMatchObject({
      type: 'input',
      label: '手机号',
      placeholder: '请输入手机号'
    });
  });

  it('updates the existing title block when the prompt asks to rename it', () => {
    const changeSet = buildMockChangeSet('把标题改成活动报名表', createBaseDocument());

    expect(changeSet.operations).toHaveLength(1);
    expect(changeSet.operations[0]).toEqual({
      type: 'updateBlock',
      blockId: 'title-1',
      changes: {
        label: '活动报名表'
      }
    });
    expect(changeSet.nextDocument.title).toBe('活动报名表');
    expect(changeSet.nextDocument.blocks[0]).toMatchObject({
      id: 'title-1',
      type: 'title',
      label: '活动报名表'
    });
  });
});
