import type { SurveyBlockType } from '@/features/survey-schema/schema';

export const PALETTE_BLOCK_DRAG_TYPE = 'application/x-wenjuan-block-type';

const PALETTE_BLOCK_TYPES: SurveyBlockType[] = ['title', 'paragraph', 'input', 'singleChoice', 'multiChoice'];

export function isPaletteBlockType(value: string): value is SurveyBlockType {
  return PALETTE_BLOCK_TYPES.includes(value as SurveyBlockType);
}
