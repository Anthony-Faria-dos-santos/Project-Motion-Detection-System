import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import { startTestApp, type TestApp } from './helpers/app';
import { resetDatabase, prisma } from './helpers/db';

/**
 * Integration coverage for POST /api/auth/signup — the 5 branches called out
 * in the phase 3 plan.
 *
 *   1. Happy path: new allowed email creates a PENDING_VERIFICATION user.
 *   2. Duplicate email: responds 202 without revealing the collision (anti-enum).
 *   3. Weak password: 400 VALIDATION_ERROR from the zod schema.
 *   4. Not allowlisted / disposable: 202 without a user row (anti-enum).
 *   5. Bootstrap SUPER_ADMIN: first signup matching BOOTSTRAP_SUPER_ADMIN_EMAIL
 *      gets promoted, subsequent signups do not.
 *
 * Preconditions — requires `DATABASE_URL` pointing at a reachable test DB and
 * `SUPABASE_*` / `JWT_SECRET` / `WORKER_API_KEY` set in the test environment.
 * Supabase Auth calls are NOT mocked on purpose; the test DB owner must run
 * against a sandbox Supabase project that tolerates create+delete churn.
 */
describe('POST /api/auth/signup', () => {
  let testApp: TestApp;

  beforeAll(async () => {
    testApp = await startTestApp();
  });

  afterAll(async () => {
    await testApp.close();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await resetDatabase();
  });

  it('creates a PENDING_VERIFICATION user on the happy path', async () => {
    const res = await fetch(`${testApp.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'alice@motionops.local',
        password: 'C0rrectHorseBatteryStaple!',
        displayName: 'Alice Integration',
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0',
      }),
    });
    expect(res.status).toBe(202);

    const user = await prisma.user.findUnique({ where: { email: 'alice@motionops.local' } });
    expect(user).toBeTruthy();
    expect(user?.status).toBe('PENDING_VERIFICATION');
    expect(user?.role).toBe('VIEWER');
  });

  it('returns 202 when the email already exists (enumeration defense)', async () => {
    await prisma.user.create({
      data: {
        email: 'carol@motionops.local',
        displayName: 'Carol',
        supabaseId: 'supabase-carol-existing',
        role: 'VIEWER',
        status: 'ACTIVE',
      },
    });
    const res = await fetch(`${testApp.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'carol@motionops.local',
        password: 'Tr0ub4dor&3Again!',
        displayName: 'Carol Duplicate',
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0',
      }),
    });
    expect(res.status).toBe(202);

    // No second user row was created under a different supabaseId.
    const rows = await prisma.user.findMany({ where: { email: 'carol@motionops.local' } });
    expect(rows).toHaveLength(1);
  });

  it('rejects a weak password with 400 VALIDATION_ERROR', async () => {
    const res = await fetch(`${testApp.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'weak@motionops.local',
        password: 'short',
        displayName: 'Weak',
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0',
      }),
    });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { error: { code: string } };
    expect(body.error.code).toBe('VALIDATION_ERROR');
  });

  it('silently accepts but does not create a user when the email is not allowlisted', async () => {
    const res = await fetch(`${testApp.baseUrl}/api/auth/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'unknown@random-domain.test',
        password: 'Pr0perlyL0ngPassphrase!',
        displayName: 'Nobody',
        termsAccepted: true,
        privacyPolicyAccepted: true,
        termsVersion: '1.0',
        privacyPolicyVersion: '1.0',
      }),
    });
    expect(res.status).toBe(202);
    const rows = await prisma.user.findMany({ where: { email: 'unknown@random-domain.test' } });
    expect(rows).toHaveLength(0);
  });

  it('promotes the BOOTSTRAP_SUPER_ADMIN email on first signup, not on subsequent ones', async () => {
    const originalBootstrap = process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
    process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL = 'owner@motionops.local';
    try {
      const first = await fetch(`${testApp.baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner@motionops.local',
          password: 'FirstOwnerPass!2026',
          displayName: 'Owner',
          termsAccepted: true,
          privacyPolicyAccepted: true,
          termsVersion: '1.0',
          privacyPolicyVersion: '1.0',
        }),
      });
      expect(first.status).toBe(202);
      const owner = await prisma.user.findUnique({ where: { email: 'owner@motionops.local' } });
      expect(owner?.role).toBe('SUPER_ADMIN');

      // Second bootstrap attempt must NOT re-promote — it falls back to VIEWER.
      const second = await fetch(`${testApp.baseUrl}/api/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: 'owner+dup@motionops.local',
          password: 'SecondOwnerPass!2026',
          displayName: 'Not Owner',
          termsAccepted: true,
          privacyPolicyAccepted: true,
          termsVersion: '1.0',
          privacyPolicyVersion: '1.0',
        }),
      });
      expect(second.status).toBe(202);
      const notOwner = await prisma.user.findUnique({ where: { email: 'owner+dup@motionops.local' } });
      expect(notOwner?.role).toBe('VIEWER');
    } finally {
      if (originalBootstrap === undefined) delete process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL;
      else process.env.BOOTSTRAP_SUPER_ADMIN_EMAIL = originalBootstrap;
    }
  });
});
