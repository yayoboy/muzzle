import { z } from 'zod';

export const loginSchema = z.object({
  body: z.object({
    password: z.string().min(1, 'Password is required'),
  }),
});
