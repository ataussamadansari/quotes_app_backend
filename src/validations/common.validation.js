import { z } from 'zod';

const OBJECT_ID_REGEX = /^[0-9a-fA-F]{24}$/;

const optionalQueryNumber = (maximum = 100) =>
  z.preprocess(
    (value) => (value === undefined || value === null || value === '' ? undefined : value),
    z.coerce.number().int().positive().max(maximum).optional(),
  );

const optionalBooleanQuery = z.preprocess((value) => {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (normalizedValue === 'true') {
      return true;
    }

    if (normalizedValue === 'false') {
      return false;
    }
  }

  return value;
}, z.boolean().optional());

const nullableTrimmedString = (maximum) =>
  z.preprocess(
    (value) => {
      if (value === undefined) {
        return undefined;
      }

      if (value === null) {
        return null;
      }

      if (typeof value === 'string' && value.trim() === '') {
        return null;
      }

      return value;
    },
    z.union([z.string().trim().max(maximum), z.null()]),
  );

const httpUrlPattern = /^https?:\/\//i;
const nullableHttpUrl = z.preprocess(
  (value) => {
    if (value === undefined) {
      return undefined;
    }

    if (value === null) {
      return null;
    }

    if (typeof value === 'string' && value.trim() === '') {
      return null;
    }

    return value;
  },
  z.union([
    z.string().trim().url().refine((value) => httpUrlPattern.test(value), {
      message: 'Must use http or https.',
    }),
    z.null(),
  ]),
);

const notificationDataSchema = z.record(
  z.string(),
  z.union([z.string(), z.number(), z.boolean()]),
);

export const objectIdSchema = z.string().trim().regex(OBJECT_ID_REGEX, {
  message: 'Invalid id format.',
});

export const paginationQuerySchema = z
  .object({
    page: optionalQueryNumber(100000),
    limit: optionalQueryNumber(100),
  })
  .strict();

export const isReadQuerySchema = optionalBooleanQuery;
export const nullableTrimmedStringSchema = nullableTrimmedString;
export const nullableHttpUrlSchema = nullableHttpUrl;
export const notificationDataPayloadSchema = notificationDataSchema.optional();
export const optionalHttpUrlSchema = httpUrlPattern
  ? z
      .string()
      .trim()
      .url()
      .refine((value) => httpUrlPattern.test(value), {
        message: 'Must use http or https.',
      })
      .optional()
  : z.string().trim().url().optional();
