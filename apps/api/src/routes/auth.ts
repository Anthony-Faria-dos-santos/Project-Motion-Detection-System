import { Router, Request, Response } from 'express';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getPermissionsForRole } from '../lib/permissions';
import { isEmailAllowed } from '../lib/allowed-emails';
import {
  createEmailVerificationToken,
  consumeEmailVerificationToken,
  createPasswordResetToken,
  consumePasswordResetToken,
} from '../lib/tokens';
import { sendVerificationEmail, sendPasswordResetEmail } from '../lib/email';
import { issueMfaChallenge } from './mfa';
import { Role, UserStatus } from '@prisma/client';

function getSupabase(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  );
}

export const authRouter: ReturnType<typeof Router> = Router();

const ACCESS_TOKEN_EXPIRY = '15m';
const ACCESS_TOKEN_EXPIRY_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes — force re-login after inactivity
const MAX_FAILED_LOGIN_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict' as const,
  path: '/',
};

function setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
  res.cookie('motionops_access', accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: ACCESS_TOKEN_EXPIRY_MS,
  });
  res.cookie('motionops_refresh', refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: REFRESH_TOKEN_EXPIRY_MS,
    path: '/api/auth',
  });
}

function clearAuthCookies(res: Response): void {
  res.clearCookie('motionops_access', { ...COOKIE_OPTIONS });
  res.clearCookie('motionops_refresh', { ...COOKIE_OPTIONS, path: '/api/auth' });
}

async function issueSession(res: Response, userId: string): Promise<{ accessToken: string; refreshToken: string }> {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
  const accessToken = jwt.sign(
    { sub: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET!,
    { expiresIn: ACCESS_TOKEN_EXPIRY },
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
  return { accessToken, refreshToken };
}

function userSessionView(user: { id: string; email: string; displayName: string; role: string; updatedAt: Date; lastLoginAt: Date | null; mfaEnabled: boolean; status: UserStatus; onboardingStep: number; onboardingCompletedAt: Date | null; isDemoAccount: boolean }) {
  return {
    id: user.id,
    displayName: user.displayName,
    email: user.email,
    role: user.role,
    permissions: getPermissionsForRole(user.role),
    lastLoginAt: (user.lastLoginAt || user.updatedAt).toISOString(),
    mfaEnabled: user.mfaEnabled,
    status: user.status,
    onboardingStep: user.onboardingStep,
    onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
    isDemoAccount: user.isDemoAccount,
  };
}

// ── Schemas ────────────────────────────────────

const signupSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(12).max(128),
  displayName: z.string().min(1).max(100),
  termsAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the Terms of Service' }) }),
  privacyPolicyAccepted: z.literal(true, { errorMap: () => ({ message: 'You must accept the Privacy Policy' }) }),
  termsVersion: z.string().min(1).max(50),
  privacyPolicyVersion: z.string().min(1).max(50),
  inviteToken: z.string().optional(),
});

const verifyEmailSchema = z.object({
  token: z.string().min(64).max(64),
});

const resendVerificationSchema = z.object({
  email: z.string().email().max(254),
});

const forgotPasswordSchema = z.object({
  email: z.string().email().max(254),
});

const resetPasswordSchema = z.object({
  token: z.string().min(64).max(64),
  newPassword: z.string().min(12).max(128),
});

const loginSchema = z.object({
  email: z.string().email().max(254),
  password: z.string().min(1).max(128),
});

// ── POST /api/auth/signup ──────────────────────

authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const parsed = signupSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input', retryable: false } });
    }
    const { email, password, displayName, termsVersion, privacyPolicyVersion, inviteToken } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Check invitation if provided
    let invitationRole: Role | null = null;
    let invitationId: string | null = null;
    if (inviteToken) {
      const invitation = await prisma.userInvitation.findUnique({ where: { token: inviteToken } });
      if (invitation && !invitation.acceptedAt && !invitation.revokedAt && invitation.expiresAt > new Date()) {
        if (invitation.email.toLowerCase() === normalizedEmail) {
          invitationRole = invitation.role;
          invitationId = invitation.id;
        }
      }
      // Invalid invitation: silently ignore (don't leak existence)
    }

    // Check whitelist (skipped if valid invitation)
    if (!invitationRole && !isEmailAllowed(normalizedEmail)) {
      logger.warn({ email: normalizedEmail }, 'Signup rejected: email not in whitelist');
      // Account enumeration defense: respond as if successful
      return res.status(202).json({ message: 'If the email is allowed and not already registered, a verification email will be sent.' });
    }

    // Check if user already exists
    const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      logger.info({ email: normalizedEmail }, 'Signup attempted with existing email');
      // Account enumeration defense
      return res.status(202).json({ message: 'If the email is allowed and not already registered, a verification email will be sent.' });
    }

    // Bootstrap SUPER_ADMIN logic
    let initialRole: Role = invitationRole || Role.VIEWER;
    let bootstrapApplied = false;
    const bootstrapEmail = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
    if (!invitationRole && bootstrapEmail && normalizedEmail === bootstrapEmail.toLowerCase()) {
      const superAdminCount = await prisma.user.count({ where: { role: Role.SUPER_ADMIN, status: { not: UserStatus.DELETED } } });
      if (superAdminCount === 0) {
        initialRole = Role.SUPER_ADMIN;
        bootstrapApplied = true;
      } else {
        logger.warn({ email: normalizedEmail }, 'Bootstrap signup attempted but SUPER_ADMIN already exists');
      }
    }

    // Create Supabase auth user
    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: false,
      user_metadata: { displayName },
    });
    if (authError || !authData.user) {
      logger.error({ err: authError, email: normalizedEmail }, 'Supabase user creation failed');
      // Account enumeration defense
      return res.status(202).json({ message: 'If the email is allowed and not already registered, a verification email will be sent.' });
    }

    // Create Prisma user row
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        displayName,
        supabaseId: authData.user.id,
        role: initialRole,
        status: UserStatus.PENDING_VERIFICATION,
        termsAcceptedAt: new Date(),
        termsVersion,
        privacyPolicyAcceptedAt: new Date(),
        privacyPolicyVersion,
      },
    });

    // Mark invitation as accepted
    if (invitationId) {
      await prisma.userInvitation.update({
        where: { id: invitationId },
        data: { acceptedAt: new Date() },
      });
    }

    // Generate verification token + send email
    const token = await createEmailVerificationToken(user.id, normalizedEmail);
    await sendVerificationEmail(normalizedEmail, displayName, token);

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth:signup',
        resource: 'user',
        resourceId: user.id,
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
        comment: bootstrapApplied
          ? `Bootstrap SUPER_ADMIN auto-promoted via BOOTSTRAP_SUPER_ADMIN_EMAIL`
          : invitationRole
            ? `Signup via invitation (role: ${invitationRole})`
            : `Public signup`,
      },
    });
    if (bootstrapApplied) {
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'auth:bootstrap_super_admin',
          resource: 'user',
          resourceId: user.id,
          ipAddress: (req.ip as string) || null,
          comment: 'First user matching BOOTSTRAP_SUPER_ADMIN_EMAIL — auto-promoted',
        },
      });
    }

    return res.status(202).json({ message: 'If the email is allowed and not already registered, a verification email will be sent.' });
  } catch (err) {
    logger.error({ err }, 'Signup failed');
    // Account enumeration defense
    return res.status(202).json({ message: 'If the email is allowed and not already registered, a verification email will be sent.' });
  }
});

// ── POST /api/auth/verify-email ────────────────

authRouter.post('/verify-email', async (req: Request, res: Response) => {
  try {
    const parsed = verifyEmailSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid token format', retryable: false } });
    }
    const { token } = parsed.data;

    const result = await consumeEmailVerificationToken(token);
    if (!result) {
      return res.status(400).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Token expired or invalid', retryable: false } });
    }

    const user = await prisma.user.update({
      where: { id: result.userId },
      data: {
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth:email_verified',
        resource: 'user',
        resourceId: user.id,
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    return res.json({ message: 'Email verified successfully', loginUrl: '/login?verified=1' });
  } catch (err) {
    logger.error({ err }, 'Email verification failed');
    return res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Verification failed', retryable: true } });
  }
});

// ── POST /api/auth/resend-verification ─────────

authRouter.post('/resend-verification', async (req: Request, res: Response) => {
  try {
    const parsed = resendVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email', retryable: false } });
    }
    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user && user.status === UserStatus.PENDING_VERIFICATION) {
      const token = await createEmailVerificationToken(user.id, normalizedEmail);
      await sendVerificationEmail(normalizedEmail, user.displayName, token);
    }

    // Account enumeration defense: always 202
    return res.status(202).json({ message: 'If an account with this email exists and is pending verification, a new email has been sent.' });
  } catch (err) {
    logger.error({ err }, 'Resend verification failed');
    return res.status(202).json({ message: 'If an account with this email exists and is pending verification, a new email has been sent.' });
  }
});

// ── POST /api/auth/forgot-password ─────────────

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  try {
    const parsed = forgotPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email', retryable: false } });
    }
    const { email } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
    if (user && user.status === UserStatus.ACTIVE) {
      const token = await createPasswordResetToken(user.id, (req.ip as string) || null);
      await sendPasswordResetEmail(normalizedEmail, user.displayName, token, (req.ip as string) || null);

      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'auth:password_reset_requested',
          resource: 'user',
          resourceId: user.id,
          ipAddress: (req.ip as string) || null,
          userAgent: (req.headers['user-agent'] as string) || null,
        },
      });
    }

    // Account enumeration defense
    return res.status(202).json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  } catch (err) {
    logger.error({ err }, 'Forgot password failed');
    return res.status(202).json({ message: 'If an account exists with this email, a password reset link has been sent.' });
  }
});

// ── POST /api/auth/reset-password ──────────────

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  try {
    const parsed = resetPasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input', retryable: false } });
    }
    const { token, newPassword } = parsed.data;

    const result = await consumePasswordResetToken(token);
    if (!result) {
      return res.status(400).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Token expired or invalid', retryable: false } });
    }

    const user = await prisma.user.findUnique({ where: { id: result.userId } });
    if (!user) {
      return res.status(400).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'User not found', retryable: false } });
    }

    // Update password via Supabase admin
    const supabase = getSupabase();
    const { error: updateError } = await supabase.auth.admin.updateUserById(user.supabaseId, { password: newPassword });
    if (updateError) {
      logger.error({ err: updateError }, 'Supabase password update failed');
      return res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Password update failed', retryable: true } });
    }

    // Update Prisma user + revoke ALL refresh tokens (global session invalidation)
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: { passwordChangedAt: new Date() },
      }),
      prisma.refreshToken.updateMany({
        where: { userId: user.id, revokedAt: null },
        data: { revokedAt: new Date() },
      }),
    ]);

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth:password_reset',
        resource: 'user',
        resourceId: user.id,
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    return res.json({ message: 'Password reset successfully. Please log in with your new password.' });
  } catch (err) {
    logger.error({ err }, 'Reset password failed');
    return res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Password reset failed', retryable: true } });
  }
});

// ── POST /api/auth/login ───────────────────────

authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Email and password required', retryable: false } });
    }
    const { email, password } = parsed.data;
    const normalizedEmail = email.toLowerCase().trim();

    // Find user in Prisma first to check status before hitting Supabase
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    // Reject early on bad statuses (with same error to avoid enumeration)
    if (user) {
      if (user.status === UserStatus.DELETED) {
        return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid credentials', retryable: false } });
      }
      if (user.status === UserStatus.SUSPENDED) {
        return res.status(403).json({ error: { code: 'AUTH_ACCOUNT_SUSPENDED', message: 'Account suspended. Contact an administrator.', retryable: false } });
      }
      if (user.status === UserStatus.LOCKED) {
        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return res.status(403).json({ error: { code: 'AUTH_ACCOUNT_LOCKED', message: 'Account locked due to repeated failed logins. Try again later.', retryable: false } });
        }
        // Auto-unlock if lockout expired
        await prisma.user.update({
          where: { id: user.id },
          data: { status: UserStatus.ACTIVE, lockedUntil: null, failedLoginAttempts: 0 },
        });
      }
    }

    // Verify password via Supabase
    const supabase = getSupabase();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email: normalizedEmail, password });

    if (authError || !authData.user) {
      logger.warn({ email: normalizedEmail, ip: req.ip }, 'Failed login attempt');

      // Increment failed attempts
      if (user) {
        const newAttempts = user.failedLoginAttempts + 1;
        const updates: { failedLoginAttempts: number; status?: UserStatus; lockedUntil?: Date } = {
          failedLoginAttempts: newAttempts,
        };
        if (newAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          updates.status = UserStatus.LOCKED;
          updates.lockedUntil = new Date(Date.now() + LOCKOUT_DURATION_MS);
        }
        await prisma.user.update({ where: { id: user.id }, data: updates });

        if (newAttempts >= MAX_FAILED_LOGIN_ATTEMPTS) {
          await prisma.auditLog.create({
            data: {
              userId: user.id,
              action: 'auth:account_locked',
              resource: 'user',
              resourceId: user.id,
              ipAddress: (req.ip as string) || null,
              comment: `Account auto-locked after ${MAX_FAILED_LOGIN_ATTEMPTS} failed login attempts`,
            },
          });
        }
      }

      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid credentials', retryable: false } });
    }

    // Find or fetch the user (must exist by now — we created it in /signup)
    const dbUser = user || (await prisma.user.findUnique({ where: { supabaseId: authData.user.id } }));
    if (!dbUser) {
      logger.error({ supabaseId: authData.user.id }, 'Supabase user has no Prisma row');
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Account not properly initialized. Please contact support.', retryable: false } });
    }

    // Check status post-auth (in case user was created externally with PENDING)
    if (dbUser.status === UserStatus.PENDING_VERIFICATION) {
      return res.status(403).json({ error: { code: 'AUTH_EMAIL_NOT_VERIFIED', message: 'Please verify your email address before logging in', retryable: false } });
    }
    if (dbUser.status !== UserStatus.ACTIVE) {
      return res.status(403).json({ error: { code: 'AUTH_INSUFFICIENT_ROLE', message: 'Account not active', retryable: false } });
    }

    // If MFA is enabled, issue a challenge token instead of session cookies
    if (dbUser.mfaEnabled) {
      // Don't reset failedLoginAttempts yet — only after MFA succeeds
      const challengeToken = issueMfaChallenge(dbUser.id);
      await prisma.auditLog.create({
        data: {
          userId: dbUser.id,
          action: 'auth:login_password_ok_mfa_pending',
          resource: 'session',
          ipAddress: (req.ip as string) || null,
          userAgent: (req.headers['user-agent'] as string) || null,
        },
      });
      return res.status(200).json({ mfaRequired: true, challengeToken });
    }

    // Reset failed attempts + update lastLogin
    await prisma.user.update({
      where: { id: dbUser.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: (req.ip as string) || null,
      },
    });

    // Issue session
    await issueSession(res, dbUser.id);

    // Audit
    await prisma.auditLog.create({
      data: {
        userId: dbUser.id,
        action: 'auth:login',
        resource: 'session',
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: dbUser.id } });
    return res.json({ user: userSessionView(refreshed) });
  } catch (err) {
    logger.error({ err }, 'Login failed');
    return res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Login failed', retryable: true } });
  }
});

// ── POST /api/auth/refresh ─────────────────────

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

    // Idle-session timeout: if the refresh token has not been rotated in
    // IDLE_TIMEOUT_MS, the user has effectively been inactive — force re-login.
    if (Date.now() - storedToken.lastUsedAt.getTime() > IDLE_TIMEOUT_MS) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
      clearAuthCookies(res);
      return res.status(401).json({ error: { code: 'AUTH_SESSION_IDLE', message: 'Session expired due to inactivity. Please sign in again.', retryable: false } });
    }

    if (storedToken.user.status !== UserStatus.ACTIVE) {
      clearAuthCookies(res);
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Account not active', retryable: false } });
    }

    // Revoke old refresh token (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });

    // Issue new session
    await issueSession(res, storedToken.user.id);

    return res.json({ user: userSessionView(storedToken.user) });
  } catch (err) {
    logger.error({ err }, 'Token refresh failed');
    return res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Refresh failed', retryable: true } });
  }
});

// ── GET /api/auth/me ───────────────────────────

authRouter.get('/me', async (req: Request, res: Response) => {
  const token = req.cookies?.motionops_access || req.headers.authorization?.replace('Bearer ', '');
  if (!token) {
    return res.status(401).json({ error: { code: 'AUTH_MISSING_TOKEN', message: 'No token', retryable: false } });
  }
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
    const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
    if (!user || user.status !== UserStatus.ACTIVE) {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'User not found or not active', retryable: false } });
    }
    res.json(userSessionView(user));
  } catch {
    res.status(401).json({ error: { code: 'AUTH_EXPIRED_TOKEN', message: 'Token expired', retryable: false } });
  }
});

// ── POST /api/auth/logout ──────────────────────

authRouter.post('/logout', async (req: Request, res: Response) => {
  const refreshTokenValue = req.cookies?.motionops_refresh;
  if (refreshTokenValue) {
    await prisma.refreshToken.updateMany({
      where: { token: refreshTokenValue, revokedAt: null },
      data: { revokedAt: new Date() },
    }).catch(() => {});
  }
  clearAuthCookies(res);
  res.status(204).send();
});
