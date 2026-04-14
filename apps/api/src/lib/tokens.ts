import { randomBytes } from 'crypto';
import { prisma } from './prisma';

const VERIFICATION_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const PASSWORD_RESET_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h
const INVITATION_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Generate a cryptographically random token (32 bytes hex = 64 chars).
 */
export function generateToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Create a single-use email verification token.
 * Invalidates any prior unused tokens for the same user/email.
 */
export async function createEmailVerificationToken(userId: string, email: string): Promise<string> {
  // Invalidate previous tokens
  await prisma.emailVerificationToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken();
  await prisma.emailVerificationToken.create({
    data: {
      token,
      userId,
      email,
      expiresAt: new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
    },
  });
  return token;
}

/**
 * Validate and consume an email verification token.
 * Returns the userId on success, null on failure.
 */
export async function consumeEmailVerificationToken(token: string): Promise<{ userId: string; email: string } | null> {
  const record = await prisma.emailVerificationToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.emailVerificationToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { userId: record.userId, email: record.email };
}

/**
 * Create a single-use password reset token.
 */
export async function createPasswordResetToken(userId: string, ipAddress?: string | null): Promise<string> {
  // Invalidate previous tokens
  await prisma.passwordResetToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken();
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId,
      ipAddress: ipAddress || null,
      expiresAt: new Date(Date.now() + PASSWORD_RESET_TOKEN_TTL_MS),
    },
  });
  return token;
}

/**
 * Validate and consume a password reset token.
 */
export async function consumePasswordResetToken(token: string): Promise<{ userId: string } | null> {
  const record = await prisma.passwordResetToken.findUnique({
    where: { token },
  });

  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;

  await prisma.passwordResetToken.update({
    where: { id: record.id },
    data: { usedAt: new Date() },
  });

  return { userId: record.userId };
}

/**
 * Create an invitation token (7 days TTL).
 */
export async function createInvitationToken(): Promise<{ token: string; expiresAt: Date }> {
  return {
    token: generateToken(),
    expiresAt: new Date(Date.now() + INVITATION_TOKEN_TTL_MS),
  };
}

const PASSKEY_RECOVERY_TOKEN_TTL_MS = 60 * 60 * 1000; // 1h — short window to reduce stolen-email attack surface

/**
 * Create a single-use passkey recovery token.
 * Invalidates any prior unused tokens for the same user.
 */
export async function createPasskeyRecoveryToken(userId: string, ipAddress?: string | null): Promise<string> {
  await prisma.passkeyRecoveryToken.updateMany({
    where: { userId, usedAt: null },
    data: { usedAt: new Date() },
  });

  const token = generateToken();
  await prisma.passkeyRecoveryToken.create({
    data: {
      token,
      userId,
      ipAddress: ipAddress || null,
      expiresAt: new Date(Date.now() + PASSKEY_RECOVERY_TOKEN_TTL_MS),
    },
  });
  return token;
}

/**
 * Validate a passkey recovery token without consuming it (the consumption
 * happens at the end of the WebAuthn ceremony, so it can be retried if the
 * user aborts the platform authenticator prompt).
 */
export async function validatePasskeyRecoveryToken(token: string): Promise<{ userId: string; id: string } | null> {
  const record = await prisma.passkeyRecoveryToken.findUnique({ where: { token } });
  if (!record) return null;
  if (record.usedAt) return null;
  if (record.expiresAt < new Date()) return null;
  return { userId: record.userId, id: record.id };
}

/**
 * Mark a passkey recovery token as consumed.
 */
export async function consumePasskeyRecoveryToken(id: string): Promise<void> {
  await prisma.passkeyRecoveryToken.update({
    where: { id },
    data: { usedAt: new Date() },
  });
}
