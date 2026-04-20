import express, { type Express } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { createServer, type Server as HttpServer } from 'http';
import { requestId } from '../../../src/middleware/request-id';
import { authRouter } from '../../../src/routes/auth';
import { mfaRouter } from '../../../src/routes/mfa';
import { onboardingRouter } from '../../../src/routes/onboarding';
import { oauthRouter } from '../../../src/routes/oauth';
import { passkeyRouter } from '../../../src/routes/passkeys';
import { demoRouter } from '../../../src/routes/demo';
import { adminRouter } from '../../../src/routes/admin';
import { userRouter } from '../../../src/routes/users';
import { cameraRouter } from '../../../src/routes/cameras';
import { eventRouter } from '../../../src/routes/events';
import { configRouter } from '../../../src/routes/config';
import { healthRouter } from '../../../src/routes/health';
import { auditRouter } from '../../../src/routes/audit';
import { gdprRouter } from '../../../src/routes/gdpr';
import { dashboardRouter } from '../../../src/routes/dashboard';

export interface TestApp {
  app: Express;
  server: HttpServer;
  baseUrl: string;
  close: () => Promise<void>;
}

/**
 * Boots the same Express app the production entrypoint uses, minus the global
 * rate limiters (they would throttle repeated test runs) and minus the
 * websocket server (integration specs call HTTP endpoints only). The server
 * listens on an OS-picked port so suites can run in parallel without port
 * collisions.
 */
export async function startTestApp(): Promise<TestApp> {
  const app = express();
  app.use(requestId);
  app.use(helmet({ hsts: false }));
  app.use(cookieParser());
  app.use(express.json({ limit: '1mb' }));

  app.use('/api/auth', authRouter);
  app.use('/api/auth', mfaRouter);
  app.use('/api/auth', onboardingRouter);
  app.use('/api/auth/oauth', oauthRouter);
  app.use('/api/auth', passkeyRouter);
  app.use('/api/auth', demoRouter);
  app.use('/api/admin', adminRouter);
  app.use('/api/users', userRouter);
  app.use('/api/cameras', cameraRouter);
  app.use('/api/events', eventRouter);
  app.use('/api/config', configRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/audit', auditRouter);
  app.use('/api/gdpr', gdprRouter);
  app.use('/api/dashboard', dashboardRouter);

  const server = createServer(app);
  await new Promise<void>((resolve) => server.listen(0, resolve));
  const addr = server.address();
  const port = typeof addr === 'object' && addr ? addr.port : 0;
  const baseUrl = `http://127.0.0.1:${port}`;

  return {
    app,
    server,
    baseUrl,
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}
