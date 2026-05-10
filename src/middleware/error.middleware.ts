import { Request, Response, NextFunction } from "express";
import logger from "../lib/logger";

export function errorMiddleware(
  err: Error,
  req: Request,
  res: Response,
  _next: NextFunction,
) {
  logger.error({ err, path: req.path }, "Unhandled error");
  res.status(500).json({ success: false, error: "Internal server error" });
}
