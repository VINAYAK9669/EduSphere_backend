import { Request, Response, NextFunction } from "express";
import { fromNodeHeaders } from "better-auth/node";
import { auth } from "../lib/auth";
import { UserRole } from "../types";

export async function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  const session = await auth.api.getSession({
    headers: fromNodeHeaders(req.headers),
  });

  if (!session) {
    return res.status(401).json({ success: false, error: "Unauthorized" });
  }

  req.user = {
    id: session.user.id,
    email: session.user.email,
    role: ((session.user as Record<string, unknown>).role as UserRole) ?? "student",
    institutionId: (session.user as Record<string, unknown>).institutionId as string | undefined,
  };

  next();
}
