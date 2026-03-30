import { z } from 'zod';

import { DEVICE_PLATFORMS } from '../constants/fcm.js';
import {
  nullableHttpUrlSchema,
  nullableTrimmedStringSchema,
  objectIdSchema,
} from './common.validation.js';

export const userIdParamsSchema = z
  .object({
    userId: objectIdSchema,
  })
  .strict();

export const updateProfileSchema = z
  .object({
    name: z.string().trim().min(2).max(80).optional(),
    bio: nullableTrimmedStringSchema(280).optional(),
    avatarUrl: nullableHttpUrlSchema.optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one profile field must be provided.',
  });

export const saveFcmTokenSchema = z
  .object({
    deviceId: z.string().trim().min(1).max(120),
    token: z.string().trim().min(1).max(512),
    platform: z.enum(Object.values(DEVICE_PLATFORMS)).optional(),
  })
  .strict();
