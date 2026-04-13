export type DragMoveResolution =
  | { shouldMove: false }
  | { shouldMove: true; targetBlockId?: string };

export function resolveDragMove(
  blockIds: string[],
  activeId: string,
  overId: string | null | undefined
): DragMoveResolution {
  if (!overId || activeId === overId) {
    return { shouldMove: false };
  }

  const activeIndex = blockIds.findIndex((blockId) => blockId === activeId);
  const overIndex = blockIds.findIndex((blockId) => blockId === overId);

  if (activeIndex === -1 || overIndex === -1) {
    return { shouldMove: false };
  }

  if (activeIndex < overIndex) {
    return {
      shouldMove: true,
      targetBlockId: blockIds[overIndex + 1]
    };
  }

  return {
    shouldMove: true,
    targetBlockId: blockIds[overIndex]
  };
}
