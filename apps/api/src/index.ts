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
import { cameraRouter } from './routes/cameras';
import { eventRouter } from './routes/events';
import { configRouter } from './routes/config';
import { healthRouter } from './routes/health';
import { auditRouter } from './routes/audit';
import { gdprRouter } from './routes/gdpr';
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

// S7: Security headers
app.use(helmet());

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

// S6: Rate limiting on auth endpoints
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10, // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: 'SYSTEM_RATE_LIMITED', message: 'Too many login attempts', retryable: true } },
});

app.use('/api/auth/login', authLimiter);

// Routes
app.use('/api/auth', authRouter);
app.use('/api/cameras', cameraRouter);
app.use('/api/events', eventRouter);
app.use('/api/config', configRouter);
app.use('/api/health', healthRouter);
app.use('/api/audit', auditRouter);
app.use('/api/gdpr', gdprRouter);

// WebSocket
setupSocketHandlers(io);

const PORT = parseInt(process.env.API_PORT || '3001', 10);
httpServer.listen(PORT, () => {
  logger.info({ port: PORT }, 'MotionOps API started');
});
