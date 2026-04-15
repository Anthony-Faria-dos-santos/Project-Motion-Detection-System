import { test, expect } from '@playwright/test';

/**
 * Placeholder smoke test so that `pnpm --filter e2e test` has something to
 * run before the real journeys are implemented. The five critical journeys
 * planned for phase 3 (signup-to-dashboard, mfa-enrol-login, operator-
 * camera-event, admin-invitation, demo-account) require a seeded database
 * and will be added in a separate session once Supabase test is live.
 */
test('landing page responds with 200 and mentions MotionOps', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('body')).toContainText(/MotionOps/i);
});
