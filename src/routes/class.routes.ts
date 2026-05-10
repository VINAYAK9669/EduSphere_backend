import { Router } from "express";
import { arcjetMiddleware } from "../middleware/arcjet.middleware";
import { authMiddleware } from "../middleware/auth.middleware";
import { requireRole } from "../middleware/role.middleware";
import { validate } from "../middleware/validate.middleware";
import { createClassSchema } from "../schemas/class.schema";
import * as classController from "../controllers/class.controller";

const router = Router();

router.post(
  "/",
  arcjetMiddleware,
  authMiddleware,
  requireRole("teacher", "admin"),
  validate(createClassSchema),
  classController.createClass,
);
router.get("/", arcjetMiddleware, authMiddleware, classController.getClasses);
router.get("/:id", arcjetMiddleware, authMiddleware, classController.getClass);

export default router;
