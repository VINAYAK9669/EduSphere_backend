import { Router } from "express";
import authRoutes from "./auth.routes";
import adminRoutes from "./admin.routes";
import classRoutes from "./class.routes";
import sessionRoutes from "./session.routes";
import enrollmentRoutes from "./enrollment.routes";
import quizRoutes from "./quiz.routes";
import assessmentRoutes from "./assessment.routes";
import notesRoutes from "./notes.routes";
import aiRoutes from "./ai.routes";

const router = Router();

router.use("/auth", authRoutes);
router.use("/admin", adminRoutes);
router.use("/classes", classRoutes);
router.use("/classes/:classId/sessions", sessionRoutes);
router.use("/classes/:classId/quizzes", quizRoutes);
router.use("/classes/:classId/assessments", assessmentRoutes);
router.use("/classes/:classId/notes", notesRoutes);
router.use("/enrollments", enrollmentRoutes);
router.use("/ai", aiRoutes);

export default router;
