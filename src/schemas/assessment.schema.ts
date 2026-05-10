import { z } from 'zod';

export const createAssessmentSchema = z.object({
  studentId: z.string(),
  competencyId: z.string(),
  score: z.number().int().min(0).max(100),
  feedback: z.string().optional(),
});
