import { test, expect, type Page, type ConsoleMessage } from '@playwright/test';

/**
 * Broad smoke over every public page. Asserts the page renders a recognisable
 * landmark and records unexpected console errors. These tests do not touch the
 * database and do not submit forms, so they can run without a seeded Supabase.
 *
 * Each case must keep the set of allowed console-error substrings minimal —
 * every new noise line we tolerate is a UX regression waiting to happen.
 */

const ALLOWED_ERROR_SUBSTRINGS = [
  // Dev-time HMR + DevTools noise that we explicitly ignore.
  'Download the React DevTools',
  'Fast Refresh',
  // Cookie banner hydration timing on first paint — harmless.
  '[hydration]',
];

function trackConsoleErrors(page: Page): () => string[] {
  const errors: string[] = [];
  page.on('console', (msg: ConsoleMessage) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (ALLOWED_ERROR_SUBSTRINGS.some((s) => text.includes(s))) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(`pageerror: ${err.message}`));
  return () => errors;
}

const publicPages: Array<{ path: string; matcher: RegExp }> = [
  { path: '/', matcher: /MotionOps/i },
  { path: '/login', matcher: /sign in|log in|continue/i },
  { path: '/signup', matcher: /create|sign up|get started/i },
  { path: '/forgot-password', matcher: /reset|recover|password/i },
  { path: '/forgot-passkey', matcher: /passkey|recovery/i },
  { path: '/legal/terms', matcher: /terms/i },
  { path: '/legal/privacy', matcher: /privacy/i },
  { path: '/legal/cookies', matcher: /cookie/i },
];

for (const { path, matcher } of publicPages) {
  test(`public page ${path} renders without console errors`, async ({ page }) => {
    const getErrors = trackConsoleErrors(page);
    const response = await page.goto(path);
    expect(response?.status(), `HTTP status for ${path}`).toBeLessThan(500);
    await expect(page.locator('body')).toContainText(matcher);
    const errors = getErrors();
    expect(errors, `console errors on ${path}`).toEqual([]);
  });
}
