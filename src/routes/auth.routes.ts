import { Router } from "express";
import { toNodeHandler } from "better-auth/node";
import { arcjetMiddleware } from "../middleware/arcjet.middleware";
import { authLimiter } from "../middleware/rate-limit.middleware";
import { auth } from "../lib/auth";

const router = Router();

// All Better Auth endpoints (/sign-in, /sign-up, /sign-out, /session, etc.)
// are handled here. The frontend calls these via the Better Auth client SDK.
router.all("/*", arcjetMiddleware, authLimiter, toNodeHandler(auth));

export default router;
