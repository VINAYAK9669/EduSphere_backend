import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { eq, and } from 'drizzle-orm';
import { db } from '../db/postgres/client';
import { users, refreshTokens } from '../db/postgres/schema';
import { UserRole } from '../types';

const BCRYPT_ROUNDS = 12;
const ACCESS_TOKEN_EXPIRY = '15m';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

// Pre-hashed sentinel used when user not found — forces bcrypt.compare to always
// run so response time doesn't leak whether an email is registered.
const FAKE_HASH = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/lfW4RPXpnHRhCqQTa';

const authSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildAccessToken(user: { id: string; email: string; role: UserRole; institutionId?: string | null }) {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      role: user.role,
      ...(user.institutionId ? { institutionId: user.institutionId } : {}),
    },
    process.env.ACCESS_TOKEN_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
  );
}

function cookieDefaults() {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict' as const,
  };
}

function setTokenCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('access_token', accessToken, {
    ...cookieDefaults(),
    maxAge: 15 * 60 * 1000,
  });
  res.cookie('refresh_token', refreshToken, {
    ...cookieDefaults(),
    path: '/api/auth/refresh',
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });
}

function clearTokenCookies(res: Response) {
  res.cookie('access_token', '', { ...cookieDefaults(), maxAge: 0 });
  res.cookie('refresh_token', '', {
    ...cookieDefaults(),
    path: '/api/auth/refresh',
    maxAge: 0,
  });
}

// ─── register ─────────────────────────────────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    if (existing.length > 0) {
      return res.status(409).json({ success: false, error: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
    const id = randomUUID();

    const [created] = await db
      .insert(users)
      .values({ id, email, passwordHash })
      .returning({ id: users.id, email: users.email, role: users.role });

    return res.status(201).json({ success: true, data: created });
  } catch (err) {
    next(err);
  }
}

// ─── login ────────────────────────────────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const parsed = authSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: parsed.error.flatten(),
      });
    }

    const { email, password } = parsed.data;

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email))
      .limit(1);

    // Always run bcrypt.compare — prevents timing-based user enumeration
    const hashToCompare = user?.passwordHash ?? FAKE_HASH;
    const passwordMatch = await bcrypt.compare(password, hashToCompare);

    if (!user || !passwordMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    if (user.isLocked) {
      return res.status(403).json({ success: false, error: 'Account is locked' });
    }

    const accessToken = buildAccessToken(user);
    const refreshToken = randomUUID();
    const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    await db.insert(refreshTokens).values({
      id: randomUUID(),
      userId: user.id,
      token: refreshToken,
      familyId,
      expiresAt,
      userAgent: req.headers['user-agent'] ?? null,
      ipAddress: req.ip ?? null,
    });

    setTokenCookies(res, accessToken, refreshToken);
    return res.status(200).json({
      success: true,
      data: { id: user.id, email: user.email, role: user.role },
    });
  } catch (err) {
    next(err);
  }
}

// ─── refresh ──────────────────────────────────────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const oldToken = req.cookies?.refresh_token as string | undefined;
    if (!oldToken) {
      return res.status(401).json({ success: false, error: 'No refresh token' });
    }

    const [stored] = await db
      .select()
      .from(refreshTokens)
      .where(eq(refreshTokens.token, oldToken))
      .limit(1);

    if (!stored) {
      return res.status(401).json({ success: false, error: 'Invalid refresh token' });
    }

    // Token reuse: a revoked token being presented means a stolen token chain.
    // Nuke the entire family to force re-login on all devices that used it.
    if (stored.revoked) {
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(
          and(
            eq(refreshTokens.familyId, stored.familyId),
            eq(refreshTokens.userId, stored.userId),
          ),
        );
      clearTokenCookies(res);
      return res.status(401).json({
        success: false,
        error: 'Token reuse detected',
        code: 'TOKEN_REUSE',
      });
    }

    if (stored.expiresAt < new Date()) {
      return res.status(401).json({ success: false, error: 'Refresh token expired' });
    }

    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, stored.userId))
      .limit(1);

    if (!user || user.isLocked) {
      clearTokenCookies(res);
      return res.status(403).json({ success: false, error: 'Account access denied' });
    }

    const newRefreshToken = randomUUID();
    const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);

    // Atomic rotation: revoke old token and insert new one together
    await db.transaction(async (tx) => {
      await tx
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.id, stored.id));

      await tx.insert(refreshTokens).values({
        id: randomUUID(),
        userId: user.id,
        token: newRefreshToken,
        familyId: stored.familyId,
        parentToken: oldToken,
        expiresAt,
        userAgent: req.headers['user-agent'] ?? null,
        ipAddress: req.ip ?? null,
      });
    });

    const accessToken = buildAccessToken(user);
    setTokenCookies(res, accessToken, newRefreshToken);
    return res.status(200).json({ success: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
}

// ─── logout ───────────────────────────────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction) {
  // Clear cookies first — must succeed even if the DB revoke fails
  clearTokenCookies(res);

  const token = req.cookies?.refresh_token as string | undefined;
  if (token) {
    try {
      await db
        .update(refreshTokens)
        .set({ revoked: true })
        .where(eq(refreshTokens.token, token));
    } catch (err) {
      console.error('[logout] DB revoke failed:', (err as Error).message);
    }
  }

  return res.status(200).json({ success: true, data: { ok: true } });
}

// ─── logoutAll ────────────────────────────────────────────────────────────────

export async function logoutAll(req: Request, res: Response, next: NextFunction) {
  try {
    clearTokenCookies(res);

    await db
      .update(refreshTokens)
      .set({ revoked: true })
      .where(eq(refreshTokens.userId, req.user!.id));

    return res.status(200).json({ success: true, data: { ok: true } });
  } catch (err) {
    next(err);
  }
}

// ─── me ───────────────────────────────────────────────────────────────────────

export function me(req: Request, res: Response) {
  const { id, email, role } = req.user!;
  return res.status(200).json({ success: true, data: { id, email, role } });
}
