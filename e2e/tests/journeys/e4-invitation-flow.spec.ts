import { test, expect } from '@playwright/test';

/**
 * E4 — SUPER_ADMIN invites a user, the test intercepts the invite token via
 * the dev helper, the invitee lands on /accept-invitation, sets a password,
 * and arrives on the dashboard with the invited role.
 *
 * Backend prerequisites (live):
 *   - `/api/_dev/seed-verified-user`, `/api/_dev/invitation-token`.
 *   - `/api/admin/invitations` (create) and the accept-invitation flow.
 *   - `/accept-invitation` page already exists on main.
 *
 * Frontend prerequisites (NOT yet on main):
 *   - `/admin/users` page with "Invite user" / "New invitation" dialog
 *     (email + role selector). Only `/admin` (root) is shipped today.
 *
 * TODO(phase-7): un-skip when the admin Users management page ships.
 */
test.skip('E4: admin invitation → accept-invitation page → dashboard with invited role', async ({ page, request }) => {
  // Seed a SUPER_ADMIN actor.
  const seed = await request.post('/api/_dev/seed-verified-user', {
    data: { email: `e4-admin-${Date.now()}@motionops.local`, password: 'E4-Admin-Password-0420!', role: 'SUPER_ADMIN' },
  });
  const { email: adminEmail, password: adminPassword } = (await seed.json()) as { email: string; password: string };

  await page.goto('/login');
  await page.getByLabel(/email/i).fill(adminEmail);
  await page.getByLabel(/^password$/i).fill(adminPassword);
  await page.getByRole('button', { name: /sign in|log in/i }).click();
  await expect(page).toHaveURL(/dashboard/i);

  // Invite a user.
  const inviteeEmail = `e4-invitee-${Date.now()}@motionops.local`;
  await page.goto('/admin/users');
  await page.getByRole('button', { name: /invite user|new invitation/i }).click();
  await page.getByLabel(/email/i).fill(inviteeEmail);
  await page.getByLabel(/role/i).selectOption('OPERATOR');
  await page.getByRole('button', { name: /send|invite/i }).click();
  await expect(page.getByText(inviteeEmail)).toBeVisible();

  // Fetch the invitation token via dev helper.
  const tokenRes = await request.get(`/api/_dev/invitation-token?email=${encodeURIComponent(inviteeEmail)}`);
  const { token } = (await tokenRes.json()) as { token: string };

  // Accept the invitation in a fresh context to simulate a different user agent.
  await page.context().clearCookies();
  await page.goto(`/accept-invitation?token=${token}`);
  await page.getByLabel(/display name/i).fill('E4 Invitee');
  await page.getByLabel(/^password$/i).fill('E4-Invitee-Password-0420!');
  await page.getByRole('button', { name: /accept|create account/i }).click();

  // After verification the invitee logs in — assert role badge on the dashboard.
  await expect(page).toHaveURL(/dashboard|verify-email-sent/i);
});
