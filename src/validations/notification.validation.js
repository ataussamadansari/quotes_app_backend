import { z } from 'zod';

import {
  isReadQuerySchema,
  notificationDataPayloadSchema,
  objectIdSchema,
  optionalHttpUrlSchema,
  paginationQuerySchema,
} from './common.validation.js';

export const notificationIdParamsSchema = z
  .object({
    notificationId: objectIdSchema,
  })
  .strict();

export const notificationListQuerySchema = paginationQuerySchema
  .extend({
    isRead: isReadQuerySchema,
  })
  .strict();

export const sendToSingleTokenSchema = z
  .object({
    token: z.string().trim().min(1).max(512),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(500),
    data: notificationDataPayloadSchema,
    imageUrl: optionalHttpUrlSchema,
  })
  .strict();

export const sendToSelectedUsersSchema = z
  .object({
    userIds: z.array(objectIdSchema).min(1).max(500),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(500),
    data: notificationDataPayloadSchema,
    imageUrl: optionalHttpUrlSchema,
  })
  .strict();

export const sendToTopicSchema = z
  .object({
    topic: z.string().trim().min(1).max(120).optional(),
    title: z.string().trim().min(1).max(120),
    body: z.string().trim().min(1).max(500),
    data: notificationDataPayloadSchema,
    imageUrl: optionalHttpUrlSchema,
  })
  .strict();
