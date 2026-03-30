import { z } from 'zod';

import { SHARE_CHANNELS } from '../constants/share.js';
import { objectIdSchema, paginationQuerySchema } from './common.validation.js';

export const quoteIdParamsSchema = z
  .object({
    quoteId: objectIdSchema,
  })
  .strict();

export const quoteListQuerySchema = paginationQuerySchema;
export const quoteCommentsQuerySchema = paginationQuerySchema;

export const createQuoteSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
  })
  .strict();

export const addCommentSchema = z
  .object({
    text: z.string().trim().min(1).max(500),
    parentId: objectIdSchema.optional(),
  })
  .strict();

export const shareQuoteSchema = z
  .object({
    channel: z.enum(Object.values(SHARE_CHANNELS)).optional(),
  })
  .strict();
