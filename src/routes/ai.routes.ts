import { Router } from 'express';
import { arcjetMiddleware } from '../middleware/arcjet.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { chatQuerySchema, reflectionSchema } from '../schemas/chat.schema';
import * as aiController from '../controllers/ai.controller';

const router = Router();

router.post(
  '/chat/query',
  arcjetMiddleware,
  authMiddleware,
  requireRole('student'),
  validate(chatQuerySchema),
  aiController.chatQuery
);

router.post(
  '/reflection/generate',
  arcjetMiddleware,
  authMiddleware,
  requireRole('student'),
  validate(reflectionSchema),
  aiController.generateReflection
);

export default router;
