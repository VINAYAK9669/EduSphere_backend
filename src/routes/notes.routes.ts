import { Router } from 'express';
import { arcjetMiddleware } from '../middleware/arcjet.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import * as notesController from '../controllers/notes.controller';

const router = Router({ mergeParams: true });

router.post('/', arcjetMiddleware, authMiddleware, requireRole('teacher', 'admin'), notesController.uploadNote);
router.get('/', arcjetMiddleware, authMiddleware, notesController.getNotes);

export default router;
