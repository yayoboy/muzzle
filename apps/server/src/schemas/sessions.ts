import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    name: z.string().optional(),
  }),
});

export const sessionParamSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Session ID is required'),
  }),
});

export const sendCommandSchema = z.object({
  params: z.object({
    id: z.string().min(1, 'Session ID is required'),
  }),
  body: z.object({
    command: z.string().min(1, 'Command is required'),
  }),
});
