import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { logger } from './lib/logger';
import { validateEnv } from './lib/env';
import { requestId } from './middleware/request-id';
import { authRouter } from './routes/auth';
import { mfaRouter } from './routes/mfa';
import { onboardingRouter } from './routes/onboarding';
import { oauthRouter } from './routes/oauth';
import { passkeyRouter } from './routes/passkeys';
import { demoRouter } from './routes/demo';
import { adminRouter } from './routes/admin';
import { userRouter } from './routes/users';
import { cameraRouter } from './routes/cameras';
import { eventRouter } from './routes/events';
import { configRouter } from './routes/config';
import { healthRouter } from './routes/health';
import { auditRouter } from './routes/audit';
import { gdprRouter } from './routes/gdpr';
import { dashboardRouter } from './routes/dashboard';
import { setupSocketHandlers } from './ws/handlers';

// FIX 10: Validate required env vars at startup
validateEnv();

const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: { origin: process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined), credentials: true },
});

// FIX 9: Request ID middleware (first in chain)
app.use(requestId);

// S7: Security headers (HSTS preload-eligible in prod: 2y + subdomains + preload)
app.use(
  helmet({
    hsts:
      process.env.NODE_ENV === 'production'
        ? { maxAge: 63072000, includeSubDomains: true, preload: true }
        : false,
  }),
);

app.use(cookieParser());

app.use(cors({ origin: process.env.FRONTEND_URL || (process.env.NODE_ENV !== 'production' ? 'http://localhost:3000' : undefined), credentials: true }));

// FIX 8: Body size limit
app.use(express.json({ limit: '1mb' }));

// FIX 3: Global rate limit: 100 requests per minute per IP
const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'SYSTEM_RATE_LIMITED', message: 'Too many requests', retryable: true } },
});

app.use('/api', globalLimiter);

// S6: Rate limiting on /login (preserved from previous hardening)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'SYSTEM_RATE_LIMITED', message: 'Too many login attempts', retryable: true } },
});
app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/login/mfa', loginLimiter);

// S+1: STRICT rate limit on /signup (account creation)
const signupLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 5, // 5 signups per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'SYSTEM_RATE_LIMITED', message: 'Too many signup attempts. Try again later.', retryable: true } },
});
app.use('/api/auth/signup', signupLimiter);

// S+2: Rate limit on email-related public endpoints (account enumeration defense)
const emailFlowLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10, // 10 requests per hour per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'SYSTEM_RATE_LIMITED', message: 'Too many requests. Try again later.', retryable: true } },
});
app.use('/api/auth/verify-email', emailFlowLimiter);
app.use('/api/auth/resend-verification', emailFlowLimiter);
app.use('/api/auth/forgot-password', emailFlowLimiter);
app.use('/api/auth/reset-password', emailFlowLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/auth', mfaRouter); // mounted under same /api/auth prefix (mfa.ts uses /mfa/* and /login/mfa)
app.use('/api/auth', onboardingRouter); // /onboarding/step, /complete, /skip
app.use('/api/auth/oauth', oauthRouter); // /sync, /providers
app.use('/api/auth', passkeyRouter); // /passkeys/* and /passkeys/:id
app.use('/api/auth', demoRouter); // /demo/login
app.use('/api/admin', adminRouter); // /system-stats, /broadcasts, /feature-flags
app.use('/api/users', userRouter);
app.use('/api/cameras', cameraRouter);
app.use('/api/events', eventRouter);
app.use('/api/config', configRouter);
app.use('/api/health', healthRouter);
app.use('/api/audit', auditRouter);
app.use('/api/gdpr', gdprRouter);
app.use('/api/dashboard', dashboardRouter);

// WebSocket
setupSocketHandlers(io);

const PORT = parseInt(process.env.API_PORT || '3001', 10);
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'MotionOps API started');
});
