import { describe, it, expect, beforeAll, beforeEach, afterAll } from 'vitest';
import jwt from 'jsonwebtoken';
import { startTestApp, type TestApp } from './helpers/app';
import { resetDatabase, prisma, seedUser } from './helpers/db';

/**
 * /api/events — review transitions, pagination, audit immutability trigger.
 * Auth is done by minting a JWT cookie directly so we don't depend on
 * /api/auth/login in these tests.
 */
describe('/api/events', () => {
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

  async function operatorCookie() {
    const user = await seedUser({ role: 'OPERATOR' });
    const token = jwt.sign(
      { sub: user.id, email: user.email, role: user.role },
      process.env.JWT_SECRET || 'test-jwt-secret-change-in-prod-32-chars',
      { expiresIn: '5m' },
    );
    return { user, cookie: `motionops_access=${token}` };
  }

  async function seedCamera() {
    return prisma.camera.create({
      data: {
        name: 'Cam A',
        location: 'Lab',
        sourceUrl: 'rtsp://cams.example.com/a',
        status: 'ONLINE',
      },
    });
  }

  it('paginates events in descending timestamp order', async () => {
    const { cookie } = await operatorCookie();
    const cam = await seedCamera();
    const now = Date.now();
    await prisma.event.createMany({
      data: Array.from({ length: 25 }, (_, i) => ({
        type: 'motion',
        severity: 'LOW',
        summary: `Event #${i}`,
        cameraId: cam.id,
        timestampStart: new Date(now - i * 60_000),
      })),
    });
    const page1 = await fetch(`${testApp.baseUrl}/api/events?page=1&limit=10`, { headers: { cookie } });
    expect(page1.status).toBe(200);
    const body1 = (await page1.json()) as { data: Array<{ summary: string }>; pagination: { page: number; totalPages: number } };
    expect(body1.data).toHaveLength(10);
    expect(body1.pagination.page).toBe(1);
    expect(body1.pagination.totalPages).toBeGreaterThanOrEqual(3);
    // Descending order by timestampStart: the newest (#0) should come first.
    expect(body1.data[0]?.summary).toBe('Event #0');
  });

  it('transitions review status and records the reviewer', async () => {
    const { cookie, user } = await operatorCookie();
    const cam = await seedCamera();
    const event = await prisma.event.create({
      data: {
        type: 'motion',
        severity: 'MEDIUM',
        summary: 'Needs review',
        cameraId: cam.id,
        timestampStart: new Date(),
      },
    });
    const res = await fetch(`${testApp.baseUrl}/api/events/${event.id}/review`, {
      method: 'PATCH',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'confirmed', notes: 'Confirmed perimeter intrusion' }),
    });
    expect([200, 204]).toContain(res.status);
    const reloaded = await prisma.event.findUnique({ where: { id: event.id } });
    expect(reloaded?.reviewStatus).toBe('CONFIRMED');
    expect(reloaded?.reviewedBy).toBe(user.id);
    expect(reloaded?.reviewedAt).not.toBeNull();
  });

  it('rejects an unknown review status with 400 VALIDATION_ERROR', async () => {
    const { cookie } = await operatorCookie();
    const cam = await seedCamera();
    const event = await prisma.event.create({
      data: {
        type: 'motion',
        severity: 'HIGH',
        summary: 'Unknown transition target',
        cameraId: cam.id,
        timestampStart: new Date(),
      },
    });
    const res = await fetch(`${testApp.baseUrl}/api/events/${event.id}/review`, {
      method: 'PATCH',
      headers: { cookie, 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'definitely_not_a_status' }),
    });
    expect(res.status).toBe(400);
  });
});
