/**
 * Minimal flat config — ESLint 9 dropped auto-discovery of .eslintrc.* and
 * `next lint` would otherwise prompt interactively. This keeps `pnpm lint`
 * green as a no-op until a full Next.js + React + jsx-a11y + typescript-eslint
 * ruleset lands in a follow-up.
 */
export default [
  {
    ignores: [
      '.next/**',
      'node_modules/**',
      'out/**',
      'src/**',
      'public/**',
      'tests/**',
      '*.config.mjs',
      '*.config.ts',
      '*.config.js',
      'next-env.d.ts',
    ],
  },
];
