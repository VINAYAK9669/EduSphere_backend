import { Router } from 'express';
import { arcjetMiddleware } from '../middleware/arcjet.middleware';
import { authMiddleware } from '../middleware/auth.middleware';
import { requireRole } from '../middleware/role.middleware';
import { validate } from '../middleware/validate.middleware';
import { createQuizSchema, submitAttemptSchema } from '../schemas/quiz.schema';
import * as quizController from '../controllers/quiz.controller';

const router = Router({ mergeParams: true });

router.post('/', arcjetMiddleware, authMiddleware, requireRole('teacher', 'admin'), validate(createQuizSchema), quizController.createQuiz);
router.get('/:quizId', arcjetMiddleware, authMiddleware, quizController.getQuiz);
router.post('/:quizId/attempt', arcjetMiddleware, authMiddleware, requireRole('student'), validate(submitAttemptSchema), quizController.submitAttempt);

export default router;
