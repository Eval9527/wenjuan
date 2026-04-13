import { describe, expect, it } from 'vitest';
import { resolveDragMove } from '@/features/editor-core/drag-sort';

describe('resolveDragMove', () => {
  it('returns the next block id when dragging a card downward through the list', () => {
    expect(resolveDragMove(['a', 'b', 'c', 'd'], 'a', 'c')).toEqual({
      shouldMove: true,
      targetBlockId: 'd'
    });
  });

  it('returns the hovered block id when dragging a card upward', () => {
    expect(resolveDragMove(['a', 'b', 'c', 'd'], 'd', 'b')).toEqual({
      shouldMove: true,
      targetBlockId: 'b'
    });
  });

  it('treats same-card drops as a no-op', () => {
    expect(resolveDragMove(['a', 'b', 'c'], 'b', 'b')).toEqual({
      shouldMove: false
    });
  });
});
