import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { startTestApp, type TestApp } from './helpers/app';
import { resetDatabase, prisma, seedUser } from './helpers/db';

/**
 * /api/gdpr — the four obligations that the CNIL-oriented compliance review
 * called out:
 *   1. Export bundles every PII table (user, auditLogs, events reviewed by…).
 *   2. Delete pseudonymises the row and marks status=DELETED + deletedAt.
 *   3. All active refresh tokens are revoked after deletion.
 *   4. A follow-up login attempt against a deleted user is rejected.
 */
describe('/api/gdpr', () => {
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

  async function authedUser() {
    const user = await seedUser({ role: 'VIEWER' });
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-jwt-secret-change-in-prod-32-chars',
      { expiresIn: '5m' },
    );
    return { user, cookie: `motionops_access=${token}` };
  }

  it('returns a JSON export containing at least user + auditLogs keys', async () => {
    const { cookie, user } = await authedUser();
    await prisma.auditLog.create({
      data: { userId: user.id, action: 'auth:login', resource: 'user', resourceId: user.id },
    });
    const res = await fetch(`${testApp.baseUrl}/api/gdpr/export`, { headers: { cookie } });
    expect(res.status).toBe(200);
    const body = (await res.json()) as Record<string, unknown>;
    expect(body).toHaveProperty('user');
    expect(body).toHaveProperty('auditLogs');
  });

  it('pseudonymises the row on DELETE /api/gdpr/me and marks status=DELETED', async () => {
    const { cookie, user } = await authedUser();
    const res = await fetch(`${testApp.baseUrl}/api/gdpr/me`, { method: 'DELETE', headers: { cookie } });
    expect([200, 202, 204]).toContain(res.status);
    const reloaded = await prisma.user.findUnique({ where: { id: user.id } });
    expect(reloaded).not.toBeNull();
    expect(reloaded?.status).toBe('DELETED');
    expect(reloaded?.deletedAt).not.toBeNull();
    // Email must no longer equal the original plaintext (pseudonymisation).
    expect(reloaded?.email).not.toBe(user.email);
  });

  it('revokes every active refresh token of the deleted user', async () => {
    const { cookie, user } = await authedUser();
    await prisma.refreshToken.createMany({
      data: [
        { token: 'rt-alpha-' + user.id.slice(0, 8), userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) },
        { token: 'rt-beta-' + user.id.slice(0, 8), userId: user.id, expiresAt: new Date(Date.now() + 86_400_000) },
      ],
    });
    const res = await fetch(`${testApp.baseUrl}/api/gdpr/me`, { method: 'DELETE', headers: { cookie } });
    expect([200, 202, 204]).toContain(res.status);
    const remaining = await prisma.refreshToken.count({
      where: { userId: user.id, revokedAt: null },
    });
    expect(remaining).toBe(0);
  });

  it('rejects a subsequent login attempt for a pseudonymised user', async () => {
    const { cookie, user } = await authedUser();
    await fetch(`${testApp.baseUrl}/api/gdpr/me`, { method: 'DELETE', headers: { cookie } });
    const res = await fetch(`${testApp.baseUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: user.email, password: 'StillTryingAfterDelete!2026' }),
    });
    expect(res.status).toBeGreaterThanOrEqual(400);
  });
});
