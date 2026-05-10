import { z } from 'zod';

export const chatQuerySchema = z.object({
  question: z.string().min(1),
  noteId: z.string(),
});

export const reflectionSchema = z.object({
  classId: z.string(),
  sessionId: z.string().optional(),
});
