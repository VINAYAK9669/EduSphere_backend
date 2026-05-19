import { Router } from "express";
import { arcjetMiddleware } from "../middleware/arcjet.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { authLimiter } from "../middleware/rate-limit.middleware";
import {
  register,
  login,
  refresh,
  logout,
  logoutAll,
  me,
} from "../controllers/auth.controller";

const router = Router();

router.post("/register", arcjetMiddleware, authLimiter, register);
router.post("/login",    arcjetMiddleware, authLimiter, login);
router.post("/refresh",  arcjetMiddleware, authLimiter, refresh);
router.post("/logout",                                  logout);
router.post("/logout-all", authMiddleware,              logoutAll);
router.get("/me",          authMiddleware,              me);

export default router;
