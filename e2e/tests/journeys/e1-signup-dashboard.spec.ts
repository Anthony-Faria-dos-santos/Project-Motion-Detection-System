import { test, expect } from '@playwright/test';

/**
 * E1 — Signup → email-verify interception → login → dashboard KPIs visible.
 *
 * Backend prerequisites (live):
 *   - `/api/_dev/verification-token` returns the active token for a given email.
 *   - DB isolation: the Playwright runner must point `DATABASE_URL` at a
 *     dedicated schema (e.g. `?schema=test_e2e`); the CI job currently passes
 *     `DATABASE_URL` straight through, so the schema suffix is the runner's
 *     responsibility (Vitest integration tests have their own `test_integration`
 *     schema and are NOT shared with this E2E spec).
 *
 * Frontend prerequisites (NOT yet on main):
 *   - `/signup` page with the email/password/displayName form + ToS/Privacy toggles.
 *   - `/verify-email-sent` (or `/check-your-email`) confirmation page.
 *   - `/verify-email?token=...` page that calls `POST /api/auth/verify-email`
 *     (the web ApiClient prefixes with the API base URL) and redirects to
 *     `/login` on success.
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
