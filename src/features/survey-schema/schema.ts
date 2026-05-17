import { z } from 'zod';

export const choiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1)
});

export const titleBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('title'),
  label: z.string().min(1),
  level: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  align: z.enum(['left', 'center', 'right']).optional()
});

export const paragraphBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('paragraph'),
  content: z.string().min(1),
  align: z.enum(['left', 'center', 'right']).optional()
});

export const inputBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('input'),
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
  placeholder: z.string().optional()
});

export const singleChoiceBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('singleChoice'),
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(choiceOptionSchema).min(1)
});

export const multiChoiceBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('multiChoice'),
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
  options: z.array(choiceOptionSchema).min(1)
});

export const surveyBlockSchema = z.discriminatedUnion('type', [
  titleBlockSchema,
  paragraphBlockSchema,
  inputBlockSchema,
  singleChoiceBlockSchema,
  multiChoiceBlockSchema
]);

const surveyDocumentObjectSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  blocks: z.array(surveyBlockSchema),
  settings: z.object({
    submitLabel: z.string().min(1),
    theme: z.literal('light').optional()
  }),
  meta: z.object({
    version: z.number().int().positive(),
    createdAt: z.string().min(1),
    updatedAt: z.string().min(1)
  })
});

function normalizeLegacyBlocks(input: unknown) {
  if (!input || typeof input !== 'object' || !('blocks' in input)) {
    return input;
  }

  const maybeDocument = input as { blocks?: unknown };

  if (!Array.isArray(maybeDocument.blocks)) {
    return input;
  }

  return {
    ...input,
    blocks: maybeDocument.blocks.map((block) => {
      if (
        block &&
        typeof block === 'object' &&
        'type' in block &&
        (block as { type?: unknown }).type === 'title' &&
        'level' in block &&
        (block as { level?: unknown }).level === 'p'
      ) {
        const legacyBlock = block as {
          id?: unknown;
          label?: unknown;
          align?: unknown;
        };

        return {
          id: typeof legacyBlock.id === 'string' ? legacyBlock.id : '',
          type: 'paragraph',
          content: typeof legacyBlock.label === 'string' && legacyBlock.label.trim() ? legacyBlock.label : '正文段落',
          align: legacyBlock.align
        };
      }

      return block;
    })
  };
}

export const surveyDocumentSchema = z.preprocess(normalizeLegacyBlocks, surveyDocumentObjectSchema);

export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type TitleBlock = z.infer<typeof titleBlockSchema>;
export type ParagraphBlock = z.infer<typeof paragraphBlockSchema>;
export type InputBlock = z.infer<typeof inputBlockSchema>;
export type SingleChoiceBlock = z.infer<typeof singleChoiceBlockSchema>;
export type MultiChoiceBlock = z.infer<typeof multiChoiceBlockSchema>;
export type SurveyDocument = z.infer<typeof surveyDocumentSchema>;
export type SurveyBlock = z.infer<typeof surveyBlockSchema>;
export type SurveyBlockType = SurveyBlock['type'];
