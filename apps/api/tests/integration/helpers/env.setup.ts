import { config } from 'dotenv';
import path from 'node:path';

config({ path: path.resolve(__dirname, '../../../../../.env') });

const TEST_SCHEMA = 'test_integration';

function withTestSchema(url: string | undefined): string | undefined {
  if (!url) return url;
  const parsed = new URL(url);
  parsed.searchParams.set('schema', TEST_SCHEMA);
  return parsed.toString();
}

process.env.DATABASE_URL = withTestSchema(process.env.DATABASE_URL);
process.env.DIRECT_URL = withTestSchema(process.env.DIRECT_URL);

if (!process.env.DATABASE_URL) {
  throw new Error(
    'Integration tests require DATABASE_URL in the monorepo root .env (loaded via env.setup.ts).',
  );
}
