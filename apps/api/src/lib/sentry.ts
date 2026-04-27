import * as Sentry from '@sentry/node';

// Initialize Sentry as early as possible. When SENTRY_DSN is unset (e.g. local
// dev without an account), the SDK stays disabled and is effectively a no-op.
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  environment: process.env.NODE_ENV ?? 'development',
  tracesSampleRate: 0.1,
  enabled: Boolean(process.env.SENTRY_DSN),
});

export { Sentry };
