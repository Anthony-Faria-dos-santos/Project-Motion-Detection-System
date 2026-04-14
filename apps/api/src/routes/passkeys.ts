import { Router, Request, Response } from 'express';
import { z } from 'zod';
import jwt from 'jsonwebtoken';
import { randomBytes } from 'crypto';
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';
import speakeasy from 'speakeasy';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';
import {
  createPasskeyRecoveryToken,
  validatePasskeyRecoveryToken,
  consumePasskeyRecoveryToken,
} from '../lib/tokens';
import { sendPasskeyRecoveryEmail } from '../lib/email';
import { decryptSecret } from '../lib/crypto';

export const passkeyRouter: ReturnType<typeof Router> = Router();

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

/**
 * Relying Party config — must match the frontend origin.
 * In production, set FRONTEND_URL to https://app.motionops.com and rpID to motionops.com.
 */
function getRpConfig() {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';
  const url = new URL(frontendUrl);
  return {
    rpName: 'MotionOps',
    rpID: url.hostname,
    expectedOrigin: frontendUrl,
  };
}

/**
 * In-memory challenge store. Maps userId -> { challenge, expiresAt }.
 * For a multi-instance backend, replace with Redis or use a short-lived JWT.
 */
const challengeStore = new Map<string, { challenge: string; expiresAt: number }>();
const CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function setChallenge(key: string, challenge: string): void {
  challengeStore.set(key, { challenge, expiresAt: Date.now() + CHALLENGE_TTL_MS });
}
function getChallenge(key: string): string | null {
  const entry = challengeStore.get(key);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    challengeStore.delete(key);
    return null;
  }
  challengeStore.delete(key); // single-use
  return entry.challenge;
}

const enrollVerifySchema = z.object({
  attestationResponse: z.unknown(),
  deviceName: z.string().max(100).optional(),
});

const loginOptionsSchema = z.object({
  email: z.string().email().max(254),
});

const loginVerifySchema = z.object({
  challengeToken: z.string().min(20),
  assertionResponse: z.unknown(),
});

// ── POST /api/auth/passkeys/register/options ───

passkeyRouter.post('/passkeys/register/options', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    const existing = await prisma.passkey.findMany({
      where: { userId },
      select: { credentialId: true, transports: true },
    });

    const { rpID, rpName } = getRpConfig();
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id, 'utf8'),
      userName: user.email,
      userDisplayName: user.displayName,
      attestationType: 'none',
      excludeCredentials: existing.map((p) => ({
        id: p.credentialId,
        transports: p.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    setChallenge(`enroll:${userId}`, options.challenge);
    res.json(options);
  } catch (err) {
    logger.error({ err }, 'Passkey register options failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to start passkey enrollment', retryable: true } });
  }
});

// ── POST /api/auth/passkeys/register/verify ────

passkeyRouter.post('/passkeys/register/verify', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = enrollVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid attestation', retryable: false } });
    }
    const userId = req.user!.id;
    const expectedChallenge = getChallenge(`enroll:${userId}`);
    if (!expectedChallenge) {
      return res.status(400).json({ error: { code: 'PASSKEY_NO_CHALLENGE', message: 'Challenge expired or already used. Restart enrollment.', retryable: false } });
    }

    const { rpID, expectedOrigin } = getRpConfig();
    const verification = await verifyRegistrationResponse({
      response: parsed.data.attestationResponse as RegistrationResponseJSON,
      expectedChallenge,
      expectedOrigin,
      expectedRPID: rpID,
    });

    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: { code: 'PASSKEY_VERIFICATION_FAILED', message: 'Passkey verification failed', retryable: false } });
    }

    const { credential, credentialDeviceType: _deviceType, credentialBackedUp: _backedUp } = verification.registrationInfo;
    const transports = (parsed.data.attestationResponse as RegistrationResponseJSON).response?.transports || [];

    await prisma.passkey.create({
      data: {
        userId,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        deviceName: parsed.data.deviceName || null,
        transports: transports as string[],
      },
    });

    await prisma.auditLog.create({
      data: {
        userId,
        action: 'auth:passkey_enrolled',
        resource: 'user',
        resourceId: userId,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment: parsed.data.deviceName || null,
      },
    });

    res.json({ verified: true, message: 'Passkey enrolled successfully' });
  } catch (err) {
    logger.error({ err }, 'Passkey register verify failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Passkey enrollment failed', retryable: true } });
  }
});

// ── POST /api/auth/passkeys/login/options ──────

passkeyRouter.post('/passkeys/login/options', async (req: Request, res: Response) => {
  try {
    const parsed = loginOptionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email', retryable: false } });
    }
    const email = parsed.data.email.toLowerCase().trim();

    // Find user + passkeys
    const user = await prisma.user.findUnique({ where: { email }, include: { passkeys: true } });

    // Account enumeration defense: always generate plausible options.
    // If user/passkeys missing, we still return options with allowCredentials:[]
    // which will fail client-side without leaking existence.
    const { rpID } = getRpConfig();
    const allowCredentials = (user?.passkeys || []).map((p) => ({
      id: p.credentialId,
      transports: p.transports as AuthenticatorTransportFuture[],
    }));

    const options = await generateAuthenticationOptions({
      rpID,
      allowCredentials,
      userVerification: 'preferred',
    });

    // Bind challenge to a short-lived JWT instead of session storage,
    // because the user might not be authenticated yet.
    const challengeToken = jwt.sign(
      {
        challenge: options.challenge,
        sub: user?.id || 'anonymous',
        type: 'passkey-login',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '5m' },
    );

    res.json({ options, challengeToken });
  } catch (err) {
    logger.error({ err }, 'Passkey login options failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to start passkey login', retryable: true } });
  }
});

// ── POST /api/auth/passkeys/login/verify ───────

passkeyRouter.post('/passkeys/login/verify', async (req: Request, res: Response) => {
  try {
    const parsed = loginVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid request', retryable: false } });
    }
    const { challengeToken, assertionResponse } = parsed.data;

    let payload: { challenge: string; sub: string; type: string };
    try {
      payload = jwt.verify(challengeToken, process.env.JWT_SECRET!) as { challenge: string; sub: string; type: string };
    } catch {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Challenge expired or invalid', retryable: false } });
    }
    if (payload.type !== 'passkey-login') {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid challenge type', retryable: false } });
    }

    const credentialId = (assertionResponse as AuthenticationResponseJSON).id;
    const passkey = await prisma.passkey.findUnique({
      where: { credentialId },
      include: { user: true },
    });
    if (!passkey) {
      return res.status(401).json({ error: { code: 'PASSKEY_UNKNOWN', message: 'Unknown credential', retryable: false } });
    }

    // Status checks
    if (passkey.user.status !== 'ACTIVE') {
      return res.status(403).json({ error: { code: 'AUTH_INSUFFICIENT_ROLE', message: 'Account not active', retryable: false } });
    }

    const { rpID, expectedOrigin } = getRpConfig();
    const verification = await verifyAuthenticationResponse({
      response: assertionResponse as AuthenticationResponseJSON,
      expectedChallenge: payload.challenge,
      expectedOrigin,
      expectedRPID: rpID,
      credential: {
        id: passkey.credentialId,
        publicKey: passkey.publicKey,
        counter: Number(passkey.counter),
        transports: passkey.transports as AuthenticatorTransportFuture[],
      },
    });

    if (!verification.verified) {
      return res.status(401).json({ error: { code: 'PASSKEY_VERIFICATION_FAILED', message: 'Verification failed', retryable: false } });
    }

    // Update counter (replay protection)
    await prisma.passkey.update({
      where: { id: passkey.id },
      data: {
        counter: BigInt(verification.authenticationInfo.newCounter),
        lastUsedAt: new Date(),
      },
    });

    // Issue session
    const accessToken = jwt.sign(
      { sub: passkey.user.id, email: passkey.user.email, role: passkey.user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' },
    );
    const refreshToken = randomBytes(64).toString('hex');
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: passkey.user.id,
        expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS),
      },
    });
    setAuthCookies(res, accessToken, refreshToken);

    await prisma.user.update({
      where: { id: passkey.user.id },
      data: {
        failedLoginAttempts: 0,
        lockedUntil: null,
        lastLoginAt: new Date(),
        lastLoginIp: getIp(req),
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: passkey.user.id,
        action: 'auth:passkey_login',
        resource: 'session',
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
      },
    });

    return res.json({
      user: {
        id: passkey.user.id,
        displayName: passkey.user.displayName,
        email: passkey.user.email,
        role: passkey.user.role,
        permissions: [],
        lastLoginAt: new Date().toISOString(),
        mfaEnabled: passkey.user.mfaEnabled,
        status: passkey.user.status,
        onboardingStep: passkey.user.onboardingStep,
        onboardingCompletedAt: passkey.user.onboardingCompletedAt?.toISOString() ?? null,
        isDemoAccount: passkey.user.isDemoAccount,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Passkey login verify failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Passkey login failed', retryable: true } });
  }
});

// ── POST /api/auth/passkeys/recovery/request ───
// Public. Triggers a recovery email if the email matches an active user.
// Always responds 202 to defend against account enumeration.

const recoveryRequestSchema = z.object({
  email: z.string().email().max(254),
});

passkeyRouter.post('/passkeys/recovery/request', async (req: Request, res: Response) => {
  try {
    const parsed = recoveryRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid email', retryable: false } });
    }
    const email = parsed.data.email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email } });
    if (user && user.status === 'ACTIVE') {
      const token = await createPasskeyRecoveryToken(user.id, getIp(req));
      await sendPasskeyRecoveryEmail(email, user.displayName, token, getIp(req));
      await prisma.auditLog.create({
        data: {
          userId: user.id,
          action: 'auth:passkey_recovery_requested',
          resource: 'user',
          resourceId: user.id,
          ipAddress: getIp(req),
          userAgent: getUserAgent(req),
        },
      });
    } else {
      logger.info({ email }, 'Passkey recovery requested for unknown or inactive email');
    }
    return res.status(202).json({ message: 'If an account matches, a recovery email has been sent.' });
  } catch (err) {
    logger.error({ err }, 'Passkey recovery request failed');
    return res.status(202).json({ message: 'If an account matches, a recovery email has been sent.' });
  }
});

// ── POST /api/auth/passkeys/recovery/options ───
// Validates the recovery token; if user has MFA enabled requires a TOTP code.
// Returns WebAuthn registration options + a short-lived challenge JWT
// that binds the upcoming enrolment to this recovery ceremony.

const recoveryOptionsSchema = z.object({
  token: z.string().min(64).max(64),
  mfaCode: z.string().min(6).max(10).optional(),
});

passkeyRouter.post('/passkeys/recovery/options', async (req: Request, res: Response) => {
  try {
    const parsed = recoveryOptionsSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', retryable: false } });
    }
    const { token, mfaCode } = parsed.data;

    const validated = await validatePasskeyRecoveryToken(token);
    if (!validated) {
      return res.status(401).json({ error: { code: 'RECOVERY_TOKEN_INVALID', message: 'Recovery link is invalid or has expired', retryable: false } });
    }

    const user = await prisma.user.findUniqueOrThrow({ where: { id: validated.userId } });
    if (user.status !== 'ACTIVE') {
      return res.status(403).json({ error: { code: 'AUTH_INSUFFICIENT_ROLE', message: 'Account not active', retryable: false } });
    }

    // MFA gate: users with TOTP enabled must present a valid code before
    // being allowed to enrol a new passkey via recovery.
    if (user.mfaEnabled) {
      if (!mfaCode) {
        return res.status(401).json({ error: { code: 'MFA_REQUIRED', message: 'MFA code required for passkey recovery', retryable: false } });
      }
      const challenge = await prisma.mfaChallenge.findUnique({ where: { userId: user.id } });
      if (!challenge || !challenge.verified) {
        return res.status(401).json({ error: { code: 'MFA_NOT_ENROLLED', message: 'MFA state inconsistent', retryable: false } });
      }
      const totpValid = speakeasy.totp.verify({
        secret: decryptSecret(challenge.secret),
        encoding: 'base32',
        token: mfaCode,
        window: 1,
      });
      if (!totpValid) {
        return res.status(401).json({ error: { code: 'MFA_INVALID_CODE', message: 'Invalid MFA code', retryable: false } });
      }
    }

    const existing = await prisma.passkey.findMany({
      where: { userId: user.id },
      select: { credentialId: true, transports: true },
    });

    const { rpID, rpName } = getRpConfig();
    const options = await generateRegistrationOptions({
      rpName,
      rpID,
      userID: Buffer.from(user.id, 'utf8'),
      userName: user.email,
      userDisplayName: user.displayName,
      attestationType: 'none',
      excludeCredentials: existing.map((p) => ({
        id: p.credentialId,
        transports: p.transports as AuthenticatorTransportFuture[],
      })),
      authenticatorSelection: {
        residentKey: 'preferred',
        userVerification: 'preferred',
      },
    });

    const registrationChallengeToken = jwt.sign(
      {
        sub: user.id,
        challenge: options.challenge,
        recoveryTokenId: validated.id,
        type: 'passkey-recovery-enrol',
      },
      process.env.JWT_SECRET!,
      { expiresIn: '10m' },
    );

    res.json({ options, registrationChallengeToken });
  } catch (err) {
    logger.error({ err }, 'Passkey recovery options failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to start recovery enrolment', retryable: true } });
  }
});

// ── POST /api/auth/passkeys/recovery/verify ────
// Verifies the WebAuthn attestation, creates the new passkey, consumes the
// recovery token, and issues a fresh session (access + refresh cookies).

const recoveryVerifySchema = z.object({
  registrationChallengeToken: z.string().min(20),
  attestationResponse: z.unknown(),
  deviceName: z.string().max(100).optional(),
});

passkeyRouter.post('/passkeys/recovery/verify', async (req: Request, res: Response) => {
  try {
    const parsed = recoveryVerifySchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid input', retryable: false } });
    }
    const { registrationChallengeToken, attestationResponse, deviceName } = parsed.data;

    let payload: { sub: string; challenge: string; recoveryTokenId: string; type: string };
    try {
      payload = jwt.verify(registrationChallengeToken, process.env.JWT_SECRET!) as typeof payload;
    } catch {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Challenge expired or invalid', retryable: false } });
    }
    if (payload.type !== 'passkey-recovery-enrol') {
      return res.status(401).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'Invalid challenge type', retryable: false } });
    }

    const { rpID, expectedOrigin } = getRpConfig();
    const verification = await verifyRegistrationResponse({
      response: attestationResponse as RegistrationResponseJSON,
      expectedChallenge: payload.challenge,
      expectedOrigin,
      expectedRPID: rpID,
    });
    if (!verification.verified || !verification.registrationInfo) {
      return res.status(400).json({ error: { code: 'PASSKEY_VERIFICATION_FAILED', message: 'Passkey verification failed', retryable: false } });
    }

    const { credential } = verification.registrationInfo;
    const transports = (attestationResponse as RegistrationResponseJSON).response?.transports || [];

    await prisma.passkey.create({
      data: {
        userId: payload.sub,
        credentialId: credential.id,
        publicKey: Buffer.from(credential.publicKey),
        counter: BigInt(credential.counter),
        deviceName: deviceName || null,
        transports: transports as string[],
      },
    });

    // Consume the recovery token after successful enrolment.
    await consumePasskeyRecoveryToken(payload.recoveryTokenId);

    const user = await prisma.user.findUniqueOrThrow({ where: { id: payload.sub } });

    // Issue a fresh session for the user (same pattern as /passkeys/login/verify).
    const accessToken = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET!,
      { expiresIn: '15m' },
    );
    const refreshToken = randomBytes(64).toString('hex');
    await prisma.refreshToken.create({
      data: { token: refreshToken, userId: user.id, expiresAt: new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS) },
    });
    setAuthCookies(res, accessToken, refreshToken);

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
        action: 'auth:passkey_recovery_completed',
        resource: 'user',
        resourceId: user.id,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment: deviceName || null,
      },
    });

    return res.json({
      user: {
        id: user.id,
        displayName: user.displayName,
        email: user.email,
        role: user.role,
        permissions: [],
        lastLoginAt: new Date().toISOString(),
        mfaEnabled: user.mfaEnabled,
        status: user.status,
        onboardingStep: user.onboardingStep,
        onboardingCompletedAt: user.onboardingCompletedAt?.toISOString() ?? null,
        isDemoAccount: user.isDemoAccount,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Passkey recovery verify failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Passkey recovery failed', retryable: true } });
  }
});

// ── DELETE /api/auth/passkeys/:id ──────────────

passkeyRouter.delete('/passkeys/:id', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const userId = req.user!.id;
    const passkey = await prisma.passkey.findUnique({ where: { id } });
    if (!passkey || passkey.userId !== userId) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Passkey not found', retryable: false } });
    }
    await prisma.passkey.delete({ where: { id } });
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'auth:passkey_revoked',
        resource: 'user',
        resourceId: userId,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment: passkey.deviceName || passkey.credentialId.slice(0, 12),
      },
    });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Passkey revoke failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to revoke passkey', retryable: true } });
  }
});
