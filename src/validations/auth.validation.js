import { z } from 'zod';

export const registerSchema = z
  .object({
    name: z.string().trim().min(2).max(80),
    email: z.string().trim().email(),
    password: z
      .string()
      .min(8)
      .max(128)
      .regex(/^(?=.*[A-Za-z])(?=.*\d).+$/, {
        message: 'Password must contain at least one letter and one number.',
      }),
  })
  .strict();

export const loginSchema = z
  .object({
    email: z.string().trim().email(),
    password: z.string().min(1).max(128),
  })
  .strict();

export const googleLoginSchema = z
  .object({
    idToken: z.string().trim().min(1),
  })
  .strict();
