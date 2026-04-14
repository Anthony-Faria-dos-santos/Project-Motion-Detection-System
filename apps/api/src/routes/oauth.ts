import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { Role, UserStatus } from '@prisma/client';

export const oauthRouter: ReturnType<typeof Router> = Router();

const ACCESS_TOKEN_EXPIRY = '15m';
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
}

function getIp(req: Request): string | null {
  return typeof req.ip === 'string' ? req.ip : null;
}
function getUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : null;
}

const SUPPORTED_PROVIDERS = ['google', 'github', 'azure'] as const;

const syncSchema = z.object({
  // Supabase access token (JWT) obtained on the frontend after OAuth redirect
  supabaseAccessToken: z.string().min(20),
  // Provider name (must match what was used to initiate the OAuth flow)
  provider: z.enum(SUPPORTED_PROVIDERS),
});

interface SupabaseUserPayload {
  sub: string;
  email?: string;
  user_metadata?: {
    full_name?: string;
    name?: string;
    avatar_url?: string;
    user_name?: string;
    preferred_username?: string;
  };
  app_metadata?: {
    provider?: string;
    providers?: string[];
  };
}

/**
 * POST /api/auth/oauth/sync
 * Called by the frontend after a successful Supabase OAuth redirect.
 * The frontend has already exchanged the code for a Supabase session and
 * sends us the access token. We:
 * 1. Verify the token via the Supabase admin client (auth.getUser)
 * 2. Look up or create the corresponding Prisma User
 * 3. Upsert a LinkedAccount entry
 * 4. Issue our own motionops cookies (access + refresh)
 * 5. Audit log the OAuth login
 *
 * Auto-link strategy: if a user with the same email already exists, we attach
 * the LinkedAccount to that existing user (regardless of how they originally
 * signed up). Email match = trust, since both Google/GitHub/Microsoft verify
 * email ownership before issuing tokens.
 */
oauthRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const parsed = syncSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input', retryable: false } });
    }
    const { supabaseAccessToken, provider } = parsed.data;

    // Verify the Supabase token by calling getUser via the admin client
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );
    const { data: userData, error: userError } = await supabase.auth.getUser(supabaseAccessToken);
    if (userError || !userData.user) {
      logger.warn({ err: userError }, 'OAuth sync: invalid Supabase token');
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid OAuth session', retryable: false } });
    }

    const supabaseUser = userData.user as unknown as SupabaseUserPayload & { id: string; email: string };
    const supabaseId = supabaseUser.id;
    const email = supabaseUser.email?.toLowerCase().trim();
    if (!email) {
      return res.status(400).json({ error: { code: 'OAUTH_NO_EMAIL', message: 'Provider did not return an email address. Cannot create account.', retryable: false } });
    }

    const displayName =
      supabaseUser.user_metadata?.full_name ||
      supabaseUser.user_metadata?.name ||
      supabaseUser.user_metadata?.user_name ||
      supabaseUser.user_metadata?.preferred_username ||
      email.split('@')[0];
    const avatarUrl = supabaseUser.user_metadata?.avatar_url || null;

    // Look up existing user by supabaseId first, then by email (auto-link)
    let user = await prisma.user.findUnique({ where: { supabaseId } });
    if (!user) {
      user = await prisma.user.findUnique({ where: { email } });
    }

    if (!user) {
      // Create a new user via OAuth
      // OAuth users are considered email-verified (provider already verified)
      user = await prisma.user.create({
        data: {
          email,
          displayName,
          supabaseId,
          role: Role.VIEWER,
          status: UserStatus.ACTIVE,
          emailVerifiedAt: new Date(),
          avatarUrl,
          // Terms acceptance — OAuth users still need to accept eventually,
          // but for the MVP we capture an implicit acceptance here.
          // In Q6 (legal pages) this will be replaced by an explicit modal.
          termsAcceptedAt: new Date(),
          termsVersion: '2026-04-10-v1',
          privacyPolicyAcceptedAt: new Date(),
          privacyPolicyVersion: '2026-04-10-v1',
        },
      });
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'auth:oauth_signup',
          resource: 'user',
          resourceId: user.id,
          ipAddress: getIp(req),
          userAgent: getUserAgent(req),
          comment: `OAuth signup via ${provider}`,
        },
      });
    } else if (user.supabaseId !== supabaseId) {
      // Existing email-based user that just OAuth-linked for the first time.
      // Update their supabaseId and avatar.
      user = await prisma.user.update({
        where: { id: user.id },
        data: {
          supabaseId,
          avatarUrl: user.avatarUrl || avatarUrl,
        },
      });
    }

    // Status checks (same as /login)
    if (user.status === UserStatus.SUSPENDED) {
      return res.status(403).json({ error: { code: 'AUTH_ACCOUNT_SUSPENDED', message: 'Account suspended', retryable: false } });
    }
    if (user.status === UserStatus.LOCKED) {
      return res.status(403).json({ error: { code: 'AUTH_ACCOUNT_LOCKED', message: 'Account locked', retryable: false } });
    }
    if (user.status === UserStatus.DELETED) {
      return res.status(403).json({ error: { code: 'AUTH_ACCOUNT_DELETED', message: 'Account deleted', retryable: false } });
    }
    if (user.status === UserStatus.PENDING_VERIFICATION) {
      // OAuth users skip email verification (provider already verified)
      user = await prisma.user.update({
        where: { id: user.id },
        data: { status: UserStatus.ACTIVE, emailVerifiedAt: new Date() },
      });
    }

    // Upsert LinkedAccount
    const providerId = supabaseId; // Supabase doesn't expose the raw provider id easily, use supabaseId as a stable reference
    await prisma.linkedAccount.upsert({
      where: {
        provider_providerId: { provider, providerId },
      },
      update: {
        providerEmail: email,
        lastUsedAt: new Date(),
      },
      create: {
        userId: user.id,
        provider,
        providerId,
        providerEmail: email,
        lastUsedAt: new Date(),
      },
    });

    // MFA challenge handoff if user has MFA enabled
    if (user.mfaEnabled) {
      const challengeToken = jwt.sign(
        { sub: user.id, mfa: 'pending' },
        process.env.JWT_SECRET!,
        { expiresIn: '5m' },
      );
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'auth:oauth_login_mfa_pending',
          resource: 'session',
          ipAddress: getIp(req),
          userAgent: getUserAgent(req),
          comment: `OAuth login (${provider}) — MFA challenge issued`,
        },
      });
      return res.status(200).json({ mfaRequired: true, challengeToken });
    }

    // Issue our own session cookies
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

    // Update last login + reset failed attempts
    await prisma.user.update({
      where: { id: user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: getIp(req),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: user.id,
        action: 'auth:oauth_login',
        resource: 'session',
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment: `OAuth login via ${provider}`,
      },
    });

    const refreshed = await prisma.user.findUniqueOrThrow({ where: { id: user.id } });
    return res.json({
      user: {
        id: refreshed.id,
        displayName: refreshed.displayName,
        email: refreshed.email,
        role: refreshed.role,
        permissions: [],
        lastLoginAt: refreshed.lastLoginAt?.toISOString() ?? new Date().toISOString(),
        mfaEnabled: refreshed.mfaEnabled,
        status: refreshed.status,
        onboardingStep: refreshed.onboardingStep,
        onboardingCompletedAt: refreshed.onboardingCompletedAt?.toISOString() ?? null,
        isDemoAccount: refreshed.isDemoAccount,
      },
    });
  } catch (err) {
    logger.error({ err }, 'OAuth sync failed');
    return res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'OAuth sync failed', retryable: true } });
  }
});

/**
 * DELETE /api/auth/oauth/unlink/:provider
 * Self-service: the signed-in user unlinks one of their own OAuth providers.
 * Blocks if it would leave the user with zero authentication factors
 * (no other linked account and no passkey). Password-based recovery via
 * email remains available through Supabase Auth's reset flow, independent of this.
 */
oauthRouter.delete('/unlink/:provider', async (req: Request, res: Response) => {
  try {
    const provider = req.params.provider as string;
    if (!SUPPORTED_PROVIDERS.includes(provider as (typeof SUPPORTED_PROVIDERS)[number])) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Unsupported provider', retryable: false } });
    }
    const accessToken = req.cookies?.motionops_access;
    if (!accessToken) {
      return res.status(401).json({ error: { code: 'AUTH_MISSING_TOKEN', message: 'Authentication required', retryable: false } });
    }
    let userId: string;
    try {
      const decoded = jwt.verify(accessToken, process.env.JWT_SECRET!) as { sub: string };
      userId = decoded.sub;
    } catch {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid session', retryable: false } });
    }

    const linked = await prisma.linkedAccount.findFirst({ where: { userId, provider } });
    if (!linked) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'No linked account for this provider', retryable: false } });
    }

    const [otherLinked, passkeyCount] = await Promise.all([
      prisma.linkedAccount.count({ where: { userId, NOT: { id: linked.id } } }),
      prisma.passkey.count({ where: { userId } }),
    ]);
    if (otherLinked + passkeyCount === 0) {
      return res.status(400).json({
        error: {
          code: 'LAST_AUTH_FACTOR',
          message: 'Cannot unlink the last authentication factor. Enrol a passkey or link another provider first.',
          retryable: false,
        },
      });
    }

    await prisma.linkedAccount.delete({ where: { id: linked.id } });
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'auth:oauth_unlink',
        resource: 'linked_account',
        resourceId: linked.id,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment: `Self-service unlink of ${provider}`,
      },
    });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'OAuth unlink failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Unlink failed', retryable: true } });
  }
});

/**
 * GET /api/auth/oauth/providers
 * Public endpoint listing which OAuth providers are configured server-side.
 * The frontend uses this to decide which buttons to render.
 */
oauthRouter.get('/providers', (_req: Request, res: Response) => {
  // Provider availability is determined by env vars (set in Supabase dashboard).
  // For now we return a static list — in a future iteration we could probe Supabase.
  const providers = SUPPORTED_PROVIDERS.map((p) => ({
    id: p,
    label:
      p === 'google' ? 'Google' :
      p === 'github' ? 'GitHub' :
      p === 'azure' ? 'Microsoft' : p,
    enabled: true,
  }));
  res.json({ providers });
});
