import { test, expect } from '@playwright/test';

/**
 * E5 — Demo account journey. Clicking "Try the demo" on /login should issue
 * a demo session and land on /dashboard with the 4 demo cameras and the 12
 * demo events pre-seeded by `prisma/seed-demo.ts`.
 *
 * Backend prerequisites (live):
 *   - `/api/demo/login` route + the `prisma/seed-demo.ts` seed.
 *
 * Frontend prerequisites (NOT yet on main):
 *   - "Try the demo" button on the `/login` page (current login form is
 *     credentials-only, no demo CTA).
 *   - `/cameras` page that renders the 4 demo cameras as table rows.
 *   - `[data-testid="event-list-item"]` markers on the `/events` rows.
 *
 * TODO(phase-7): un-skip when the demo login button and Cameras page ship.
 */
test.skip('E5: demo login shows 4 demo cameras and 12 demo events', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: /try the demo|demo login/i }).click();
  await expect(page).toHaveURL(/dashboard/i);

  // Navigate to Cameras — expect the 4 demo cameras.
  await page.goto('/cameras');
  const cameraRows = page.getByRole('row').filter({ hasNot: page.getByRole('columnheader') });
  await expect(cameraRows).toHaveCount(4);

  // Navigate to Events — expect 12 demo events (first page, default limit).
  await page.goto('/events');
  const eventsList = page.getByTestId('event-list-item');
  await expect(eventsList.first()).toBeVisible();
  expect(await eventsList.count()).toBeGreaterThanOrEqual(12);
});
