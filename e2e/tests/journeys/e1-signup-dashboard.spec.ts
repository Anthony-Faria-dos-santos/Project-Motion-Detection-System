import { test, expect } from '@playwright/test';

/**
 * E1 — Signup → email-verify interception → login → dashboard KPIs visible.
 *
 * Backend prerequisites (live):
 *   - `/api/_dev/verification-token` returns the active token for a given email.
 *   - DB isolation via `?schema=test_integration`.
 *
 * Frontend prerequisites (NOT yet on main):
 *   - `/signup` page with the email/password/displayName form + ToS/Privacy toggles.
 *   - `/verify-email-sent` (or `/check-your-email`) confirmation page.
 *   - `/verify-email?token=...` page that calls `POST /auth/verify-email` and
 *     redirects to `/login` on success.
 *
 * TODO(phase-7): un-skip when the signup + verify-email frontend pages are finished.
 */
test.skip('E1: signup → verify email → login → dashboard renders KPIs', async ({ page, request }) => {
  const email = `e1-${Date.now()}@motionops.local`;
  const password = 'E2E-Strong-Password-0420!';

  // Signup via the public page (exercises the zod form validation, ToS toggle).
  await page.goto('/signup');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByLabel(/display name|full name/i).fill('E1 User');
  await page.getByLabel(/terms/i).check();
  await page.getByLabel(/privacy/i).check();
  await page.getByRole('button', { name: /sign up|create account/i }).click();
  await expect(page).toHaveURL(/verify-email-sent|check-your-email/i);

  // Grab the verification token via the dev-only helper endpoint.
  const tokenRes = await request.get(`/api/_dev/verification-token?email=${encodeURIComponent(email)}`);
  expect(tokenRes.ok()).toBeTruthy();
  const { token } = (await tokenRes.json()) as { token: string };

  // Verify + follow the redirect to /login.
  await page.goto(`/verify-email?token=${token}`);
  await expect(page).toHaveURL(/login/i);

  // Log in and land on the dashboard.
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/i);

  // KPIs row must render (activeCameras + alertsToday cards are first-class).
  await expect(page.getByText(/active cameras/i)).toBeVisible();
  await expect(page.getByText(/alerts today/i)).toBeVisible();
});
