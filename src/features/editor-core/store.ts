import { produce } from 'immer';
import { createStore } from 'zustand/vanilla';
import type { AiDraftChangeSet } from '@/features/ai-assistant/types';
import { createBlock, createEmptySurvey } from '@/features/survey-schema/factories';
import type { SurveyBlock, SurveyBlockType, SurveyDocument } from '@/features/survey-schema/schema';
import { commitHistory, createHistoryState, redoHistory, type HistoryState, undoHistory } from './history';

export type PreviewMode = 'desktop' | 'mobile';

export type EditorStoreState = {
  survey: SurveyDocument;
  selectedBlockId: string | null;
  previewMode: PreviewMode;
  pendingChangeSet: AiDraftChangeSet | null;
  canUndo: boolean;
  canRedo: boolean;
  addBlock: (input: { type: SurveyBlockType }) => void;
  updateBlock: (blockId: string, patch: Partial<SurveyBlock>) => void;
  removeBlock: (blockId: string) => void;
  moveBlock: (blockId: string, targetBlockId?: string) => void;
  selectBlock: (blockId: string | null) => void;
  setPreviewMode: (mode: PreviewMode) => void;
  setPendingChangeSet: (changeSet: AiDraftChangeSet | null) => void;
  discardPendingChangeSet: () => void;
  applyPendingChangeSet: () => void;
  undo: () => void;
  redo: () => void;
};

type InternalEditorState = EditorStoreState & {
  history: HistoryState<SurveyDocument>;
};

function bumpVersion(nextSurvey: SurveyDocument): SurveyDocument {
  return {
    ...nextSurvey,
    meta: {
      ...nextSurvey.meta,
      version: nextSurvey.meta.version + 1,
      updatedAt: new Date().toISOString()
    }
  };
}

function withCommittedSurvey(
  state: InternalEditorState,
  nextSurvey: SurveyDocument,
  options?: { keepVersion?: boolean }
) {
  const surveyToCommit = options?.keepVersion ? nextSurvey : bumpVersion(nextSurvey);
  const history = commitHistory(state.history, surveyToCommit);

  return {
    survey: history.present,
    history,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    pendingChangeSet: null
  };
}

function moveBlockInList(blocks: SurveyBlock[], blockId: string, targetBlockId?: string) {
  const currentIndex = blocks.findIndex((block) => block.id === blockId);
  if (currentIndex === -1) {
    return blocks;
  }

  const nextBlocks = [...blocks];
  const [activeBlock] = nextBlocks.splice(currentIndex, 1);

  if (!targetBlockId) {
    nextBlocks.push(activeBlock);
    return nextBlocks;
  }

  const targetIndex = nextBlocks.findIndex((block) => block.id === targetBlockId);
  if (targetIndex === -1) {
    nextBlocks.push(activeBlock);
    return nextBlocks;
  }

  nextBlocks.splice(targetIndex, 0, activeBlock);
  return nextBlocks;
}

export function createEditorStore({ surveyId }: { surveyId: string }) {
  const initialSurvey = createEmptySurvey({ id: surveyId });
  const initialHistory = createHistoryState(initialSurvey);

  return createStore<InternalEditorState>()((set, get) => ({
    survey: initialSurvey,
    history: initialHistory,
    selectedBlockId: null,
    previewMode: 'desktop',
    pendingChangeSet: null,
    canUndo: false,
    canRedo: false,
    addBlock: ({ type }) =>
      set((state) => {
        const newBlock = createBlock(type);
        const nextSurvey = produce(state.survey, (draft) => {
          draft.blocks.push(newBlock);
        });

        return {
          ...withCommittedSurvey(state, nextSurvey),
          selectedBlockId: newBlock.id
        };
      }),
    updateBlock: (blockId, patch) =>
      set((state) => {
        const existingIndex = state.survey.blocks.findIndex((block) => block.id === blockId);
        if (existingIndex === -1) {
          return state;
        }

        const nextSurvey = produce(state.survey, (draft) => {
          const current = draft.blocks[existingIndex];
          draft.blocks[existingIndex] = {
            ...current,
            ...patch,
            id: current.id,
            type: current.type
          } as SurveyBlock;
        });

        return withCommittedSurvey(state, nextSurvey);
      }),
    removeBlock: (blockId) =>
      set((state) => {
        if (!state.survey.blocks.some((block) => block.id === blockId)) {
          return state;
        }

        const nextSurvey = produce(state.survey, (draft) => {
          draft.blocks = draft.blocks.filter((block) => block.id !== blockId);
        });

        return {
          ...withCommittedSurvey(state, nextSurvey),
          selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId
        };
      }),
    moveBlock: (blockId, targetBlockId) =>
      set((state) => {
        const nextBlocks = moveBlockInList(state.survey.blocks, blockId, targetBlockId);
        if (nextBlocks === state.survey.blocks) {
          return state;
        }

        const nextSurvey = {
          ...state.survey,
          blocks: nextBlocks
        };

        return withCommittedSurvey(state, nextSurvey);
      }),
    selectBlock: (blockId) => set(() => ({ selectedBlockId: blockId })),
    setPreviewMode: (mode) => set(() => ({ previewMode: mode })),
    setPendingChangeSet: (changeSet) => set(() => ({ pendingChangeSet: changeSet })),
    discardPendingChangeSet: () => set(() => ({ pendingChangeSet: null })),
    applyPendingChangeSet: () =>
      set((state) => {
        const changeSet = state.pendingChangeSet;
        if (!changeSet || changeSet.basedOnVersion !== state.survey.meta.version) {
          return state;
        }

        return {
          ...withCommittedSurvey(state, changeSet.nextDocument, { keepVersion: true }),
          selectedBlockId: changeSet.nextDocument.blocks.at(-1)?.id ?? null
        };
      }),
    undo: () =>
      set((state) => {
        const history = undoHistory(state.history);
        if (history === state.history) {
          return state;
        }

        return {
          history,
          survey: history.present,
          canUndo: history.past.length > 0,
          canRedo: history.future.length > 0,
          selectedBlockId: history.present.blocks.some((block) => block.id === state.selectedBlockId)
            ? state.selectedBlockId
            : null
        };
      }),
    redo: () =>
      set((state) => {
        const history = redoHistory(state.history);
        if (history === state.history) {
          return state;
        }

        return {
          history,
          survey: history.present,
          canUndo: history.past.length > 0,
          canRedo: history.future.length > 0,
          selectedBlockId: history.present.blocks.some((block) => block.id === state.selectedBlockId)
            ? state.selectedBlockId
            : null
        };
      })
  }));
}
