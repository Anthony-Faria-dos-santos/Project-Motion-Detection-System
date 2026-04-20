import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright config for MotionOps end-to-end tests.
 *
 * These tests require a running backend (`@motionops/api`) and frontend
 * (`@motionops/web`) plus a reachable Supabase / Postgres test database.
 * They are intentionally NOT run by the default `pnpm test` — invoke them
 * with `pnpm --filter e2e exec playwright test` or via the dedicated CI job.
 *
 * The `webServer` block boots the dev servers automatically when the
 * commands detect no listener on their ports. If you already have the stack
 * running (e.g. via `pnpm dev`), Playwright reuses it.
 */
export default defineConfig({
  testDir: './tests',
  timeout: 30_000,
  expect: { timeout: 5_000 },
  fullyParallel: false, // keep suites serial so they can share a seeded DB
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    // Firefox / WebKit enabled in CI only to keep local iterations fast.
    ...(process.env.CI
      ? [
          { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
          { name: 'webkit', use: { ...devices['Desktop Safari'] } },
        ]
      : []),
  ],
  webServer: process.env.E2E_SKIP_SERVERS
    ? undefined
    : [
        {
          command: 'pnpm --filter @motionops/api dev',
          port: 3001,
          reuseExistingServer: !process.env.CI,
          timeout: 60_000,
        },
        {
          command: 'pnpm --filter @motionops/web dev',
          port: 3000,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
        },
      ],
});
