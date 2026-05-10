import { Request } from 'express';

export type UserRole = 'admin' | 'teacher' | 'student';

export interface AuthUser {
  id: string;
  email: string;
  role: UserRole;
  institutionId?: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}
