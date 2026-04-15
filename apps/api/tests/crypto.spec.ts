import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { randomBytes } from 'crypto';
import { encryptSecret, decryptSecret, generateBackupCodes } from '../src/lib/crypto';

// Fresh key for the test suite; restored after to avoid leaking into other specs.
let previous: string | undefined;
beforeAll(() => {
  previous = process.env.MFA_ENCRYPTION_KEY;
  process.env.MFA_ENCRYPTION_KEY = randomBytes(32).toString('hex');
});
afterAll(() => {
  process.env.MFA_ENCRYPTION_KEY = previous;
});

describe('crypto helpers', () => {
  describe('encryptSecret + decryptSecret round-trip', () => {
    it('round-trips an ASCII plaintext', () => {
      const plain = 'JBSWY3DPEHPK3PXP';
      const cipher = encryptSecret(plain);
      expect(cipher).not.toBe(plain);
      expect(decryptSecret(cipher)).toBe(plain);
    });

    it('round-trips a Unicode plaintext', () => {
      const plain = 'héllo-motionops-Δ';
      expect(decryptSecret(encryptSecret(plain))).toBe(plain);
    });

    it('produces different ciphertexts for the same plaintext (random IV)', () => {
      const a = encryptSecret('x');
      const b = encryptSecret('x');
      expect(a).not.toBe(b);
    });

    it('throws when the ciphertext is tampered with (GCM auth tag check)', () => {
      const cipher = encryptSecret('trusted-value');
      const buf = Buffer.from(cipher, 'base64');
      // Flip one byte inside the ciphertext region.
      buf[buf.length - 20] ^= 0xff;
      const tampered = buf.toString('base64');
      expect(() => decryptSecret(tampered)).toThrow();
    });
  });

  describe('getKey validation (via encryptSecret)', () => {
    it('throws when MFA_ENCRYPTION_KEY is unset', () => {
      const saved = process.env.MFA_ENCRYPTION_KEY;
      delete process.env.MFA_ENCRYPTION_KEY;
      try {
        expect(() => encryptSecret('foo')).toThrowError(/MFA_ENCRYPTION_KEY/);
      } finally {
        process.env.MFA_ENCRYPTION_KEY = saved;
      }
    });

    it('throws when MFA_ENCRYPTION_KEY has wrong length', () => {
      const saved = process.env.MFA_ENCRYPTION_KEY;
      process.env.MFA_ENCRYPTION_KEY = 'deadbeef';
      try {
        expect(() => encryptSecret('foo')).toThrowError(/64 hex characters/);
      } finally {
        process.env.MFA_ENCRYPTION_KEY = saved;
      }
    });
  });

  describe('generateBackupCodes', () => {
    it('returns exactly 10 codes', () => {
      expect(generateBackupCodes()).toHaveLength(10);
    });

    it('returns codes in the XXXXX-XXXXX format', () => {
      const codes = generateBackupCodes();
      for (const c of codes) {
        expect(c).toMatch(/^[0-9A-F]{5}-[0-9A-F]{5}$/);
      }
    });

    it('returns unique codes per call', () => {
      const codes = generateBackupCodes();
      const set = new Set(codes);
      expect(set.size).toBe(10);
    });
  });
});
