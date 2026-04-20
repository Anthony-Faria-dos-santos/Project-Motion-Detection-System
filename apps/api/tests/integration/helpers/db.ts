import { prisma } from '../../../src/lib/prisma';

/**
 * Reset order respects FK constraints so child rows vanish before parents.
 * Called in a `beforeEach` to guarantee suite isolation without teardown.
 */
const DELETE_ORDER = [
  'auditLog',
  'passkeyRecoveryToken',
  'passkey',
  'linkedAccount',
  'emailVerificationToken',
  'passwordResetToken',
  'refreshToken',
  'userInvitation',
  'event',
  'camera',
  'systemMessage',
  'featureFlag',
  'user',
] as const;

type Model = (typeof DELETE_ORDER)[number];

export async function resetDatabase(): Promise<void> {
  for (const model of DELETE_ORDER) {
    // `as any` is deliberate — Prisma doesn't generate an indexed accessor type
    // for delegate lookup, but the runtime shape is `prisma[model].deleteMany`.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (prisma as any)[model].deleteMany({});
  }
}

export async function seedUser(overrides: Partial<Parameters<typeof prisma.user.create>[0]['data']> = {}) {
  return prisma.user.create({
    data: {
      email: `test-${Date.now()}-${Math.random().toString(36).slice(2, 8)}@motionops.local`,
      displayName: 'Test User',
      supabaseId: `supabase-${Math.random().toString(36).slice(2, 12)}`,
      role: 'VIEWER',
      status: 'ACTIVE',
      termsAcceptedAt: new Date(),
      termsVersion: '1.0',
      privacyPolicyAcceptedAt: new Date(),
      privacyPolicyVersion: '1.0',
      ...overrides,
    },
  });
}

export { prisma, type Model };
