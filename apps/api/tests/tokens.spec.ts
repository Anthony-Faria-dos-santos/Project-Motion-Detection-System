import { describe, it, expect } from 'vitest';
import { generateToken } from '../src/lib/tokens';

// Pure-function tests. The create/consume/validate helpers hit the database
// and live in the integration suite (tests/integration/**, DB-gated).

describe('generateToken', () => {
  it('returns a 64-char hex string', () => {
    const t = generateToken();
    expect(t).toHaveLength(64);
    expect(t).toMatch(/^[0-9a-f]{64}$/);
  });

  it('produces cryptographically unique values (no duplicates in 1000 calls)', () => {
    const set = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      set.add(generateToken());
    }
    expect(set.size).toBe(1000);
  });
});
