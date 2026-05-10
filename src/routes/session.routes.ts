import { Router } from 'express';
import { arcjetMiddleware } from '../middleware/arcjet.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createSessionSchema } from '../schemas/session.schema';
import * as sessionController from '../controllers/session.controller';

const router = Router({ mergeParams: true });

router.post('/', arcjetMiddleware, authMiddleware, requireRole('teacher', 'admin'), validate(createSessionSchema), sessionController.createSession);
router.get('/', arcjetMiddleware, authMiddleware, sessionController.getSessions);

export default router;
