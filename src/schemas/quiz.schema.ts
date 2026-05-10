import { z } from 'zod';

const questionSchema = z.object({
  text: z.string().min(1),
  options: z.array(z.string()).min(2),
  correctIndex: z.number().int().min(0),
  competencyId: z.string().optional(),
});

export const createQuizSchema = z.object({
  title: z.string().min(1),
  questions: z.array(questionSchema).min(1),
});

export const submitAttemptSchema = z.object({
  answers: z.array(z.number().int().min(0)),
});
