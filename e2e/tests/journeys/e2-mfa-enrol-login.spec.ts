import { test, expect } from '@playwright/test';

/**
 * E2 — Login → enrol MFA (TOTP) → logout → login requires TOTP → success.
 *
 * Backend prerequisites (live):
 *   - `/api/_dev/seed-verified-user` (creates a verified user with a known password).
 *   - `/api/mfa/enroll/start` + `/api/mfa/enroll/confirm` (and the TOTP login challenge).
 *
 * Frontend prerequisites (NOT yet on main):
 *   - `/settings/mfa` enrol page exposing the `otpauth-url` test id.
 *   - TOTP challenge step on `/login` after a primary password success.
 *   - A visible "Sign out" / "Log out" control in the dashboard shell.
 *
 * TODO(phase-7): un-skip when the MFA enrol UI and the login TOTP challenge UI ship.
 */
test.skip('E2: enrol MFA, re-login with TOTP, dashboard accessible', async ({ page, request }) => {
  // Seed via dev-only helper: creates a verified user with a known password.
  const seed = await request.post('/api/_dev/seed-verified-user', {
    data: { email: `e2-${Date.now()}@motionops.local`, password: 'E2-Strong-Password-0420!', role: 'OPERATOR' },
  });
  const { email, password } = (await seed.json()) as { email: string; password: string };

  // Step 1 — log in without MFA (no challenge yet).
  await page.goto('/login');
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/i);

  // Step 2 — enrol MFA from settings. The page calls /mfa/enroll/start and
  // surfaces the otpauth URL from which we derive a TOTP.
  await page.goto('/settings/mfa');
  await page.getByRole('button', { name: /enable mfa|enrol/i }).click();
  const otpauth = await page.getByTestId('otpauth-url').innerText();
  const secret = otpauth.match(/secret=([^&]+)/)?.[1];
  expect(secret).toBeTruthy();

  // Derive the 6-digit TOTP in-test — cast through an otplib/speakeasy helper.
  const { authenticator } = await import('otplib');
  const code = authenticator.generate(secret!);
  await page.getByLabel(/verification code|totp/i).fill(code);
  await page.getByRole('button', { name: /verify|confirm/i }).click();
  await expect(page.getByText(/mfa enabled|enrolled/i)).toBeVisible();

  // Step 3 — log out, log back in. Password alone must now trigger a challenge.
  await page.getByRole('button', { name: /log ?out|sign ?out/i }).click();
  await expect(page).toHaveURL(/login/i);
  await page.getByLabel(/email/i).fill(email);
  await page.getByLabel(/^password$/i).fill(password);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page.getByLabel(/verification code|totp/i)).toBeVisible();

  const code2 = authenticator.generate(secret!);
  await page.getByLabel(/verification code|totp/i).fill(code2);
  await page.getByRole('button', { name: /verify|confirm/i }).click();
  await expect(page).toHaveURL(/dashboard/i);
});
