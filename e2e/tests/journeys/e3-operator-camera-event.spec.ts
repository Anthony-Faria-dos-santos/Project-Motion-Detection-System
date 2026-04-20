import { test, expect } from '@playwright/test';

/**
 * E3 — OPERATOR: create a camera, see it in the list, review a seeded mock
 * event, observe the audit trail entry.
 *
 * Skipped until the seed helpers are live. The flow is already supported by
 * the API routes + frontend pages; this is a wiring test, not a new feature.
 */
test.skip('E3: operator creates camera, reviews event, audit log shows entry', async ({ page, request }) => {
  const seed = await request.post('/api/_dev/seed-verified-user', {
    data: { email: `e3-${Date.now()}@motionops.local`, password: 'E3-Strong-Password-0420!', role: 'OPERATOR' },
  });
  const { email, password, userId } = (await seed.json()) as { email: string; password: string; userId: string };

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/i);

  // Create a camera from the Cameras page.
  await page.goto('/cameras');
  await page.getByRole('button', { name: /add camera|new camera/i }).click();
  await page.getByLabel(/name/i).fill('E3 Test Camera');
  await page.getByLabel(/location/i).fill('E3 Lab');
  await page.getByLabel(/source url|stream/i).fill('rtsp://cams.example.com/e3');
  await page.getByRole('button', { name: /save|create/i }).click();
  await expect(page.getByText('E3 Test Camera')).toBeVisible();

  // Seed an event against that camera via dev helper, then review it.
  const camRes = await request.get('/api/cameras?page=1&limit=50');
  const cams = (await camRes.json()) as { data: Array<{ id: string; name: string }> };
  const camId = cams.data.find((c) => c.name === 'E3 Test Camera')?.id;
  expect(camId).toBeTruthy();

  await request.post('/api/_dev/seed-event', {
    data: { cameraId: camId, severity: 'MEDIUM', summary: 'Mock intrusion' },
  });

  await page.goto('/events');
  const row = page.getByRole('row', { name: /mock intrusion/i });
  await expect(row).toBeVisible();
  await row.getByRole('button', { name: /review|confirm/i }).click();
  await page.getByRole('button', { name: /confirm/i }).click();

  // Audit log row visible for this operator.
  const audit = await request.get('/api/audit?page=1&limit=5');
  expect(audit.status()).toBe(200);
  const auditBody = (await audit.json()) as { data: Array<{ userId: string; action: string }> };
  expect(auditBody.data.some((l) => l.userId === userId && l.action.startsWith('event:'))).toBeTruthy();
});
