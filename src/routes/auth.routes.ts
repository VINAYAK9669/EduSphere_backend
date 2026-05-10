import { Router } from "express";
import { arcjetMiddleware } from "../middleware/arcjet.middleware";

const router = Router();

// Better Auth handler will be mounted here
// router.all('/auth/*', arcjetMiddleware, toNodeHandler(auth));

export default router;
