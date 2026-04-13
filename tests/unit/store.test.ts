import { describe, expect, it } from 'vitest';
import { createEditorStore } from '@/features/editor-core/store';

describe('editor store', () => {
  it('adds blocks, reorders them, and supports undo/redo', () => {
    const store = createEditorStore({ surveyId: 'demo' });

    store.getState().addBlock({ type: 'title' });
    store.getState().addBlock({ type: 'input' });

    const [firstBlock, secondBlock] = store.getState().survey.blocks;

    expect(firstBlock.type).toBe('title');
    expect(secondBlock.type).toBe('input');

    store.getState().moveBlock(secondBlock.id, firstBlock.id);
    expect(store.getState().survey.blocks[0].type).toBe('input');

    store.getState().undo();
    expect(store.getState().survey.blocks[0].type).toBe('title');

    store.getState().redo();
    expect(store.getState().survey.blocks[0].type).toBe('input');
  });

  it('updates and removes a block while keeping selection in sync', () => {
    const store = createEditorStore({ surveyId: 'demo' });

    store.getState().addBlock({ type: 'singleChoice' });

    const block = store.getState().survey.blocks[0];
    expect(store.getState().selectedBlockId).toBe(block.id);

    store.getState().updateBlock(block.id, { label: '你对产品满意吗？' });
    expect(store.getState().survey.blocks[0].label).toBe('你对产品满意吗？');

    store.getState().removeBlock(block.id);
    expect(store.getState().survey.blocks).toHaveLength(0);
    expect(store.getState().selectedBlockId).toBeNull();
  });
});
