import { defineConfig } from 'vitest/config';

/**
 * Integration tests hit a real Postgres on the test_integration schema.
 * Files must run sequentially — each file's beforeEach truncates the shared
 * schema, so parallel files would trample each other's state.
 */
export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/integration/**/*.spec.ts'],
    setupFiles: ['./tests/integration/helpers/env.setup.ts'],
    fileParallelism: false,
    maxWorkers: 1,
    minWorkers: 1,
    testTimeout: 20_000,
    hookTimeout: 20_000,
  },
});
