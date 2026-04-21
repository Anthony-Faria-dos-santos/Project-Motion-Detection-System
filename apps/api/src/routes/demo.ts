import { Router, Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { UserStatus } from '@prisma/client';

export const demoRouter: ReturnType<typeof Router> = Router();

const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('motionops_access', accessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_EXPIRY_MS });
  res.cookie('motionops_refresh', refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_EXPIRY_MS, path: '/api/auth' });
  res.cookie('motionops_has_session', '1', {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    path: '/',
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
  });
}

function getIp(req: Request): string | null {
  return typeof req.ip === 'string' ? req.ip : null;
}
function getUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : null;
}

/**
 * POST /api/auth/demo/login
 * Public endpoint that issues a session for the dedicated demo account.
 *
 * Security model:
 * - Only works if a User row with `isDemoAccount = true` exists in the DB.
 * - The demo user is created via `pnpm --filter @motionops/api run db:seed:demo`
 *   AFTER the corresponding Supabase auth user has been provisioned.
 * - Demo sessions are full sessions but the user has role VIEWER (read-only enforced
 *   by permission middleware on every mutating endpoint).
 * - Frontend additionally hides destructive actions when `user.isDemoAccount === true`.
 * - Demo accounts skip MFA challenges (the goal is one-click try).
 *
 * Rate limited via emailFlowLimiter (10/h/IP) — see index.ts.
 */
demoRouter.post('/demo/login', async (req: Request, res: Response) => {
  try {
    const demoUser = await prisma.user.findFirst({
      where: {
        isDemoAccount: true,
        status: UserStatus.ACTIVE,
      },
    });

    if (!demoUser) {
      return res.status(503).json({
        error: {
          code: 'DEMO_NOT_AVAILABLE',
          message: 'Demo mode is not configured on this instance.',
          retryable: false,
        },
      });
    }

    // Issue session
    const accessToken = jwt.sign(
      { sub: demoUser.id, email: demoUser.email, role: demoUser.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' },
    );
    const refreshToken = randomBytes(64).toString('hex');
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: demoUser.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });
    setAuthCookies(res, accessToken, refreshToken);

    // Update lastLogin
    await prisma.user.update({
      where: { id: demoUser.id },
      data: {
        lastLoginAt: new Date(),
        lastLoginIp: getIp(req),
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: demoUser.id,
        action: 'auth:demo_login',
        resource: 'session',
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
      },
    });

    res.json({
      user: {
        id: demoUser.id,
        displayName: demoUser.displayName,
        email: demoUser.email,
        role: demoUser.role,
        permissions: [],
        lastLoginAt: new Date().toISOString(),
        mfaEnabled: false,
        status: demoUser.status,
        onboardingStep: demoUser.onboardingStep,
        onboardingCompletedAt: demoUser.onboardingCompletedAt?.toISOString() ?? null,
        isDemoAccount: true,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Demo login failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Demo login failed', retryable: true } });
  }
});
