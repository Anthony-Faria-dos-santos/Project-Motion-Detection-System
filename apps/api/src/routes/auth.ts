import { Router, Request, Response } from 'express';
import { createClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getPermissionsForRole } from '../lib/permissions';

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const authRouter: ReturnType<typeof Router> = Router();

const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string) {
  res.cookie('motionops_access', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_EXPIRY_MS,
  });
  res.cookie('motionops_refresh', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: '/api/auth', // refresh token only sent to auth endpoints
  });
}

function clearAuthCookies(res: Response) {
  res.clearCookie('motionops_access', { ...COOKIE_OPTIONS });
  res.clearCookie('motionops_refresh', { ...COOKIE_OPTIONS, path: '/api/auth' });
}

// POST /api/auth/login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'AUTH_MISSING_TOKEN', message: 'Email and password required', retryable: false } });
    }

    const { data: authData, error: authError } = await getSupabase().auth.signInWithPassword({ email, password });
    if (authError || !authData.user) {
      logger.warn({ email, ip: req.ip }, 'Failed login attempt');
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid credentials', retryable: false } });
    }

    let user = await prisma.user.findUnique({ where: { supabaseId: authData.user.id } });
    if (!user) {
      user = await prisma.user.create({
        data: {
          email: authData.user.email!,
          displayName: authData.user.email!.split('@')[0],
          supabaseId: authData.user.id,
          role: 'VIEWER',
        },
      });
    }

    // Generate access token (short-lived, in cookie)
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    // Generate refresh token (long-lived, stored in DB)
    const refreshTokenValue = randomBytes(64).toString('hex');
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth:login',
        resource: 'session',
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    // Set HttpOnly cookies
    setAuthCookies(res, accessToken, refreshTokenValue);

    res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        permissions: getPermissionsForRole(user.role),
        lastLoginAt: user.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Login failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Login failed', retryable: true } });
  }
});

// POST /api/auth/refresh
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const refreshTokenValue = req.cookies?.motionops_refresh;
    if (!refreshTokenValue) {
      return res.status(401).json({ error: { code: 'AUTH_MISSING_TOKEN', message: 'No refresh token', retryable: false } });
    }

    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: true },
    });

    if (!storedToken || storedToken.revokedAt || storedToken.expiresAt < new Date()) {
      clearAuthCookies(res);
      return res.status(401).json({ error: { code: 'AUTH_EXPIRED_TOKEN', message: 'Refresh token expired or revoked', retryable: false } });
    }

    if (storedToken.user.status !== 'active') {
      clearAuthCookies(res);
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Account disabled', retryable: false } });
    }

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new tokens
    const user = storedToken.user;
    const newAccessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: ACCESS_TOKEN_EXPIRY },
    );

    const newRefreshTokenValue = randomBytes(64).toString('hex');
    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenValue,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });

    setAuthCookies(res, newAccessToken, newRefreshTokenValue);

    res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        permissions: getPermissionsForRole(user.role),
        lastLoginAt: user.updatedAt.toISOString(),
      },
    });
  } catch (err) {
    logger.error({ err }, 'Token refresh failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Refresh failed', retryable: true } });
  }
});

// GET /api/auth/me
authRouter.get('/me', async (req: Request, res: Response) => {
  const token = req.cookies?.motionops_access || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: { code: 'AUTH_MISSING_TOKEN', message: 'No token', retryable: false } });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.status !== 'active') {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'User not found or disabled', retryable: false } });
    }
    res.json({
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      role: user.role,
      permissions: getPermissionsForRole(user.role),
      lastLoginAt: user.updatedAt.toISOString(),
    });
  } catch {
    res.status(401).json({ error: { code: 'AUTH_EXPIRED_TOKEN', message: 'Token expired', retryable: false } });
  }
});

// POST /api/auth/logout
authRouter.post('/logout', async (req: Request, res: Response) => {
  const refreshTokenValue = req.cookies?.motionops_refresh;
  if (refreshTokenValue) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenValue, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => {}); // best effort
  }
  clearAuthCookies(res);
  res.status(204).send();
});
