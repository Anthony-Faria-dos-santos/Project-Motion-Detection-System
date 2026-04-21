import { defineConfig } from 'vitest/config';

/**
 * Integration tests hit a real Postgres. Run via `pnpm test:integration`
 * with a `DATABASE_URL` that points at an isolated test database.
 *
 * Suites are serialised (threads: false) so the shared DB reset in
 * `helpers/db.ts` can't race between files. For parallel runs, switch to
 * pg-mem or a per-suite schema.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.spec.ts'],
    setupFiles: ['./tests/integration/helpers/env.setup.ts'],
    pool: 'threads',
    poolOptions: {
      threads: {
        singleThread: true,
      },
    },
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
