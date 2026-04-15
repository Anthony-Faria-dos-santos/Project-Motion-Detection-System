import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: ['tests/**/*.spec.ts', 'src/**/*.spec.ts'],
    // Integration suites that talk to a real Postgres live DB are excluded
    // from the default unit run. They opt-in via `pnpm test:integration`.
    exclude: ['tests/integration/**', 'node_modules', 'dist'],
    coverage: {
      reporter: ['text', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts'],
      thresholds: {
        lines: 70,
        branches: 65,
        functions: 70,
        statements: 70,
      },
    },
  },
});
