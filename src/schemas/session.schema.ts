import { z } from 'zod';

export const createSessionSchema = z.object({
  title: z.string().min(1),
  scheduledAt: z.string().datetime().optional(),
});
