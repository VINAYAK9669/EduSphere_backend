import { Router } from 'express';
import { arcjetMiddleware } from '../middleware/arcjet.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as enrollmentController from '../controllers/enrollment.controller';

const router = Router();

router.post('/', arcjetMiddleware, authMiddleware, requireRole('student'), enrollmentController.enroll);
router.get('/', arcjetMiddleware, authMiddleware, enrollmentController.getEnrollments);

export default router;
