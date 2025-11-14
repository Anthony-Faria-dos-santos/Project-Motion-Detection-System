/**
 * Redact sensitive fields from objects before storing in audit logs.
 * Strips passwords, tokens, and credentials from URLs.
 */
const SENSITIVE_KEYS = ['password', 'token', 'secret', 'apiKey', 'authorization'];
const URL_CREDENTIAL_REGEX = /(:\/\/)([^:]+):([^@]+)@/g;

export function redactSensitive(obj: unknown): unknown {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'string') {
    return obj.replace(URL_CREDENTIAL_REGEX, '$1***:***@');
  }
  if (Array.isArray(obj)) return obj.map(redactSensitive);
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      if (SENSITIVE_KEYS.some(sk => key.toLowerCase().includes(sk))) {
        result[key] = '***REDACTED***';
      } else {
        result[key] = redactSensitive(value);
      }
    }
    return result;
  }
  return obj;
}
