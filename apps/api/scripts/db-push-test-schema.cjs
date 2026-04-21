#!/usr/bin/env node
const path = require('node:path');
const { spawnSync } = require('node:child_process');

require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

const TEST_SCHEMA = 'test_integration';

function withTestSchema(url) {
  if (!url) return undefined;
  const u = new URL(url);
  u.searchParams.set('schema', TEST_SCHEMA);
  return u.toString();
}

const directUrl = withTestSchema(process.env.DIRECT_URL);
const databaseUrl = withTestSchema(process.env.DATABASE_URL);

if (!directUrl) {
  console.error('[db-push-test-schema] DIRECT_URL is required in root .env.');
  process.exit(1);
}

console.log(`[db-push-test-schema] Pushing Prisma schema to schema="${TEST_SCHEMA}".`);

const result = spawnSync(
  'pnpm',
  ['exec', 'prisma', 'db', 'push', '--skip-generate'],
  {
    stdio: 'inherit',
    env: { ...process.env, DIRECT_URL: directUrl, DATABASE_URL: databaseUrl },
    shell: true,
    cwd: path.resolve(__dirname, '..'),
  },
);

process.exit(result.status ?? 1);
