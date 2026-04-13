import type { SurveyDocument } from './schema';

export function createEmptySurvey({ id }: { id: string }): SurveyDocument {
  const now = new Date().toISOString();

  return {
    id,
    title: '未命名问卷',
    blocks: [],
    settings: {
      submitLabel: '提交'
    },
    meta: {
      version: 1,
      createdAt: now,
      updatedAt: now
    }
  };
}
