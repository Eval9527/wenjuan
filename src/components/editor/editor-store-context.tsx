'use client';

import { createContext, useContext } from 'react';
import { useStore } from 'zustand';
import type { createEditorStore, EditorStoreState } from '@/features/editor-core/store';

type EditorStoreApi = ReturnType<typeof createEditorStore>;

export const EditorStoreContext = createContext<EditorStoreApi | null>(null);

export function useEditorStore<T>(selector: (state: EditorStoreState) => T): T {
  const store = useContext(EditorStoreContext);

  if (!store) {
    throw new Error('EditorStoreContext is missing');
  }

  return useStore(store, selector);
}
