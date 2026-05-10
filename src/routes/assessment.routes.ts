import { Router } from 'express';
import { arcjetMiddleware } from '../middleware/arcjet.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createAssessmentSchema } from '../schemas/assessment.schema';
import * as assessmentController from '../controllers/assessment.controller';

const router = Router({ mergeParams: true });

router.post('/', arcjetMiddleware, authMiddleware, requireRole('teacher', 'admin'), validate(createAssessmentSchema), assessmentController.createAssessment);
router.get('/', arcjetMiddleware, authMiddleware, assessmentController.getAssessments);

export default router;
