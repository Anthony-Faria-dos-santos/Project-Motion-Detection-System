import { Router, Request, Response } from 'express';
import { z } from 'zod';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import { encryptSecret, decryptSecret, generateBackupCodes } from '../lib/crypto';
import { getPermissionsForRole } from '../lib/permissions';
import { UserStatus } from '@prisma/client';

export const mfaRouter: ReturnType<typeof Router> = Router();

const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
const MFA_CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const APP_NAME = 'MotionOps';

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('motionops_access', accessToken, { ...COOKIE_OPTIONS, maxAge: ACCESS_TOKEN_EXPIRY_MS });
  res.cookie('motionops_refresh', refreshToken, { ...COOKIE_OPTIONS, maxAge: REFRESH_TOKEN_EXPIRY_MS, path: '/api/auth' });
}

const verifySchema = z.object({ code: z.string().min(6).max(10) });
const disableSchema = z.object({ code: z.string().min(6).max(15) });
const loginMfaSchema = z.object({
  challengeToken: z.string().min(10).max(2000),
  code: z.string().min(6).max(15),
});

// ── POST /api/auth/mfa/enroll/start ────────────

mfaRouter.post('/mfa/enroll/start', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const userId = req.user!.id;

    // Check if MFA already enrolled
    const existing = await prisma.mfaChallenge.findUnique({ where: { userId } });
    if (existing && existing.verified) {
      return res.status(409).json({ error: { code: 'MFA_ALREADY_ENROLLED', message: 'MFA already enrolled. Disable it first to re-enroll.', retryable: false } });
    }

    const secret = speakeasy.generateSecret({
      name: `${APP_NAME} (${req.user!.email})`,
      length: 32,
    });

    const backupCodes = generateBackupCodes();
    const hashedBackupCodes = await Promise.all(backupCodes.map(c => bcrypt.hash(c, 10)));

    const encryptedSecret = encryptSecret(secret.base32);

    await prisma.mfaChallenge.upsert({
      where: { userId },
      create: {
        userId,
        secret: encryptedSecret,
        backupCodes: hashedBackupCodes,
        verified: false,
      },
      update: {
        secret: encryptedSecret,
        backupCodes: hashedBackupCodes,
        verified: false,
        verifiedAt: null,
      },
    });

    const qrCodeDataUrl = await qrcode.toDataURL(secret.otpauth_url || '');

    res.json({
      secret: secret.base32,
      qrCodeDataUrl,
      backupCodes, // returned ONCE in plaintext
      otpauthUrl: secret.otpauth_url,
    });
  } catch (err) {
    logger.error({ err }, 'MFA enroll start failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to start MFA enrollment', retryable: true } });
  }
});

// ── POST /api/auth/mfa/enroll/verify ───────────

mfaRouter.post('/mfa/enroll/verify', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = verifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid code', retryable: false } });
    }
    const { code } = parsed.data;
    const userId = req.user!.id;

    const challenge = await prisma.mfaChallenge.findUnique({ where: { userId } });
    if (!challenge) {
      return res.status(400).json({ error: { code: 'MFA_NOT_STARTED', message: 'MFA enrollment not started', retryable: false } });
    }
    if (challenge.verified) {
      return res.status(400).json({ error: { code: 'MFA_ALREADY_ENROLLED', message: 'MFA already enrolled', retryable: false } });
    }

    const decryptedSecret = decryptSecret(challenge.secret);
    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      return res.status(400).json({ error: { code: 'MFA_INVALID_CODE', message: 'Invalid code', retryable: false } });
    }

    await prisma.$transaction([
      prisma.mfaChallenge.update({
        where: { userId },
        data: { verified: true, verifiedAt: new Date() },
      }),
      prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true, mfaEnrolledAt: new Date() },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'auth:mfa_enrolled',
        resource: 'user',
        resourceId: userId,
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.json({ message: 'MFA enrolled successfully' });
  } catch (err) {
    logger.error({ err }, 'MFA verify failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'MFA verification failed', retryable: true } });
  }
});

// ── POST /api/auth/mfa/disable ─────────────────

mfaRouter.post('/mfa/disable', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const parsed = disableSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Code required to disable MFA', retryable: false } });
    }
    const { code } = parsed.data;
    const userId = req.user!.id;

    const challenge = await prisma.mfaChallenge.findUnique({ where: { userId } });
    if (!challenge || !challenge.verified) {
      return res.status(400).json({ error: { code: 'MFA_NOT_ENROLLED', message: 'MFA not enrolled', retryable: false } });
    }

    const decryptedSecret = decryptSecret(challenge.secret);
    const verified = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    if (!verified) {
      // Try backup codes
      const backupMatched = await tryBackupCode(challenge.backupCodes, code, userId);
      if (!backupMatched) {
        return res.status(400).json({ error: { code: 'MFA_INVALID_CODE', message: 'Invalid code', retryable: false } });
      }
    }

    await prisma.$transaction([
      prisma.mfaChallenge.delete({ where: { userId } }),
      prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: false, mfaEnrolledAt: null },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'auth:mfa_disabled',
        resource: 'user',
        resourceId: userId,
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.json({ message: 'MFA disabled' });
  } catch (err) {
    logger.error({ err }, 'MFA disable failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to disable MFA', retryable: true } });
  }
});

// ── POST /api/auth/login/mfa ───────────────────

mfaRouter.post('/login/mfa', async (req: Request, res: Response) => {
  try {
    const parsed = loginMfaSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Challenge token and code required', retryable: false } });
    }
    const { challengeToken, code } = parsed.data;

    let decoded: { sub: string; mfa: 'pending' };
    try {
      decoded = jwt.verify(challengeToken, process.env.JWT_SECRET!) as { sub: string; mfa: 'pending' };
    } catch {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid or expired challenge', retryable: false } });
    }
    if (decoded.mfa !== 'pending') {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid challenge', retryable: false } });
    }

    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid challenge', retryable: false } });
    }
    const challenge = await prisma.mfaChallenge.findUnique({ where: { userId: user.id } });
    if (!challenge || !challenge.verified) {
      return res.status(401).json({ error: { code: 'MFA_NOT_ENROLLED', message: 'MFA not enrolled', retryable: false } });
    }

    const decryptedSecret = decryptSecret(challenge.secret);
    const totpValid = speakeasy.totp.verify({
      secret: decryptedSecret,
      encoding: 'base32',
      token: code,
      window: 1,
    });

    let backupUsed = false;
    if (!totpValid) {
      backupUsed = await tryBackupCode(challenge.backupCodes, code, user.id);
      if (!backupUsed) {
        return res.status(401).json({ error: { code: 'MFA_INVALID_CODE', message: 'Invalid code', retryable: false } });
      }
    }

    // Issue session
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' },
    );
    const refreshToken = randomBytes(64).toString('hex');
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });
    setAuthCookies(res, accessToken, refreshToken);

    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: (req.ip as string) || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: backupUsed ? 'auth:login_mfa_backup' : 'auth:login_mfa',
        resource: 'session',
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        permissions: getPermissionsForRole(user.role),
        lastLoginAt: new Date().toISOString(),
        mfaEnabled: true,
        status: user.status,
        onboardingStep: user.onboardingStep,
        onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
        isDemoAccount: user.isDemoAccount,
      },
    });
  } catch (err) {
    logger.error({ err }, 'MFA login failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'MFA login failed', retryable: true } });
  }
});

// ── Helpers ────────────────────────────────────

async function tryBackupCode(hashedCodes: string[], code: string, userId: string): Promise<boolean> {
  for (let i = 0; i < hashedCodes.length; i++) {
    const matches = await bcrypt.compare(code, hashedCodes[i]);
    if (matches) {
      // Consume the backup code (remove from list)
      const newCodes = hashedCodes.filter((_, idx) => idx !== i);
      await prisma.mfaChallenge.update({
        where: { userId },
        data: { backupCodes: newCodes },
      });
      return true;
    }
  }
  return false;
}

/**
 * Helper used by /login route to issue a challenge token if MFA is enrolled.
 * Returns a JWT valid for 5 minutes that the client must POST back to /login/mfa.
 */
export function issueMfaChallenge(userId: string): string {
  return jwt.sign(
    { sub: userId, mfa: 'pending' },
    process.env.JWT_SECRET!,
    { expiresIn: '5m' },
  );
}
export const MFA_CHALLENGE_TTL = MFA_CHALLENGE_TTL_MS;
