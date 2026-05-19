import { Request, Response, NextFunction } from 'express';
import jwt, { TokenExpiredError } from 'jsonwebtoken';
import { AuthUser, UserRole } from '../types';

interface JwtPayload {
  sub: string;
  email: string;
  role: UserRole;
  institutionId?: string;
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const token = req.cookies?.access_token as string | undefined;

  if (!token) {
    return res.status(401).json({ success: false, error: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET!) as JwtPayload;
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      institutionId: payload.institutionId,
    } satisfies AuthUser;
    next();
  } catch (err) {
    if (err instanceof TokenExpiredError) {
      return res.status(401).json({
        success: false,
        error: 'Token expired',
        code: 'TOKEN_EXPIRED',
      });
    }
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
}
