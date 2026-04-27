import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12; // GCM standard
const AUTH_TAG_LENGTH = 16;

function getKey(): Buffer {
  const hex = process.env.MFA_ENCRYPTION_KEY;
  if (!hex) {
    throw new Error('MFA_ENCRYPTION_KEY env var is required for MFA operations');
  }
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new Error('MFA_ENCRYPTION_KEY must be exactly 64 hex characters (32 bytes)');
  }
  const key = Buffer.from(hex, 'hex');
  if (key.length !== 32) {
    throw new Error('MFA_ENCRYPTION_KEY must decode to exactly 32 bytes');
  }
  return key;
}

/**
 * Encrypt a plaintext string using AES-256-GCM.
 * Returns base64-encoded `iv:ciphertext:authTag`.
 */
export function encryptSecret(plaintext: string): string {
  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, ciphertext, authTag]).toString('base64');
}

/**
 * Decrypt a base64-encoded ciphertext produced by encryptSecret().
 */
export function decryptSecret(encrypted: string): string {
  const key = getKey();
  const buf = Buffer.from(encrypted, 'base64');
  const iv = buf.subarray(0, IV_LENGTH);
  const authTag = buf.subarray(buf.length - AUTH_TAG_LENGTH);
  const ciphertext = buf.subarray(IV_LENGTH, buf.length - AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  const plaintext = Buffer.concat([decipher.update(ciphertext), decipher.final()]);
  return plaintext.toString('utf8');
}

/**
 * Generate 10 backup codes for MFA recovery.
 * Each code is 10 characters (XXXXX-XXXXX), human-readable.
 */
export function generateBackupCodes(): string[] {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const part1 = randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
    const part2 = randomBytes(4).toString('hex').toUpperCase().slice(0, 5);
    codes.push(`${part1}-${part2}`);
  }
  return codes;
}
