import { describe, it, expect } from 'vitest';
import { redactSensitive } from '../src/lib/redact';

describe('redactSensitive', () => {
  it('redacts top-level password fields', () => {
    expect(redactSensitive({ email: 'a@b.c', password: 'hunter2' })).toEqual({
      email: 'a@b.c',
      password: '***REDACTED***',
    });
  });

  it('matches sensitive keys case-insensitively and on substrings', () => {
    const out = redactSensitive({
      authorization: 'Bearer xyz',
      apiKey: 'secret-key',
      refreshToken: 'r-value',
      PASSWORD: 'p',
    }) as Record<string, string>;
    expect(out.authorization).toBe('***REDACTED***');
    expect(out.apiKey).toBe('***REDACTED***');
    expect(out.refreshToken).toBe('***REDACTED***');
    expect(out.PASSWORD).toBe('***REDACTED***');
  });

  it('recurses into nested objects', () => {
    const out = redactSensitive({
      user: { id: 1, secret: 's' },
    }) as { user: { id: number; secret: string } };
    expect(out.user.id).toBe(1);
    expect(out.user.secret).toBe('***REDACTED***');
  });

  it('recurses into arrays', () => {
    const out = redactSensitive([
      { token: 'a' },
      { token: 'b' },
    ]) as Array<{ token: string }>;
    expect(out).toHaveLength(2);
    expect(out[0]!.token).toBe('***REDACTED***');
    expect(out[1]!.token).toBe('***REDACTED***');
  });

  it('scrubs credentials inside URL strings', () => {
    expect(redactSensitive('rtsp://admin:hunter2@cam.local/stream')).toBe(
      'rtsp://***:***@cam.local/stream',
    );
  });

  it('does not touch non-credential strings', () => {
    expect(redactSensitive('rtsp://cam.local/stream')).toBe('rtsp://cam.local/stream');
  });

  it('returns null/undefined unchanged', () => {
    expect(redactSensitive(null)).toBeNull();
    expect(redactSensitive(undefined)).toBeUndefined();
  });

  it('returns primitives unchanged', () => {
    expect(redactSensitive(42)).toBe(42);
    expect(redactSensitive(true)).toBe(true);
  });
});
