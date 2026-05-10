import { Router } from "express";
import { arcjetMiddleware } from "../middleware/arcjet.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import * as adminController from "../controllers/admin.controller";

const router = Router();

router.get(
  "/users",
  arcjetMiddleware,
  authMiddleware,
  requireRole("admin"),
  adminController.getUsers,
);

export default router;
