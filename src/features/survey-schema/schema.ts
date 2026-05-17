import { z } from 'zod';

export const choiceOptionSchema = z.object({
  id: z.string().min(1),
  text: z.string().min(1)
});

export const titleBlockSchema = z.object({
  id: z.string().min(1),
  type: z.literal('title'),
  label: z.string().min(1),
  description: z.string().optional(),
  required: z.boolean().optional(),
  level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal('p')]),
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
  inputBlockSchema,
  singleChoiceBlockSchema,
  multiChoiceBlockSchema
]);

export const surveyDocumentSchema = z.object({
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

export type ChoiceOption = z.infer<typeof choiceOptionSchema>;
export type TitleBlock = z.infer<typeof titleBlockSchema>;
export type InputBlock = z.infer<typeof inputBlockSchema>;
export type SingleChoiceBlock = z.infer<typeof singleChoiceBlockSchema>;
export type MultiChoiceBlock = z.infer<typeof multiChoiceBlockSchema>;
export type SurveyDocument = z.infer<typeof surveyDocumentSchema>;
export type SurveyBlock = z.infer<typeof surveyBlockSchema>;
export type SurveyBlockType = SurveyBlock['type'];
