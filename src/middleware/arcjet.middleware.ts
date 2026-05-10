import { Request, Response, NextFunction } from "express";

// TODO: configure ArcJet rules per route group (auth: 20/min, ai: 10/min, default: 60/min)
export async function arcjetMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  next();
}
