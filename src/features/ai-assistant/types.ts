import { z } from 'zod';
import { surveyBlockSchema, surveyDocumentSchema } from '@/features/survey-schema/schema';

export const changeOperationSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('addBlock'),
    block: surveyBlockSchema,
    afterBlockId: z.string().optional()
  }),
  z.object({
    type: z.literal('removeBlock'),
    blockId: z.string().min(1)
  }),
  z.object({
    type: z.literal('moveBlock'),
    blockId: z.string().min(1),
    targetBlockId: z.string().optional()
  }),
  z.object({
    type: z.literal('updateBlock'),
    blockId: z.string().min(1),
    changes: z.record(z.string(), z.any())
  })
]);

export const aiDraftChangeSetSchema = z.object({
  id: z.string().min(1),
  basedOnVersion: z.number().int().positive(),
  userIntent: z.string().min(1),
  summary: z.string().min(1),
  operations: z.array(changeOperationSchema).min(1),
  nextDocument: surveyDocumentSchema,
  source: z.enum(['ai', 'builtin']).optional(),
  notice: z.string().min(1).optional(),
  modelAlias: z.string().min(1).optional(),
  timedOutModels: z.array(z.string().min(1)).optional()
});

export type ChangeOperation = z.infer<typeof changeOperationSchema>;
export type AiDraftChangeSet = z.infer<typeof aiDraftChangeSetSchema>;
