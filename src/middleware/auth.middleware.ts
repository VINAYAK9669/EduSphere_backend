import { Request, Response, NextFunction } from 'express';

export async function authMiddleware(req: Request, res: Response, next: NextFunction) {
  // TODO: verify Better Auth session → populate req.user
  next();
}
