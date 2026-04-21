import { Router, Request, Response, NextFunction } from 'express';
import { createClient } from '@supabase/supabase-js';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { UserStatus, Role, EventSeverity } from '@prisma/client';

export const devRouter: ReturnType<typeof Router> = Router();

devRouter.use((_req: Request, res: Response, next: NextFunction) => {
  if (process.env.NODE_ENV === 'production') {
    return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Not found', retryable: false } });
  }
  next();
});

function supabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );
}

devRouter.post('/seed-verified-user', async (req: Request, res: Response) => {
  try {
    const { email, password, role = 'VIEWER', displayName = 'E2E User' } = req.body as {
      email: string;
      password: string;
      role?: Role;
      displayName?: string;
    };
    if (!email || !password) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email and password required', retryable: false } });
    }

    const supabase = supabaseAdmin();
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error || !data.user) {
      return res.status(500).json({ error: { code: 'SUPABASE_CREATE_FAILED', message: error?.message ?? 'unknown', retryable: false } });
    }

    const user = await prisma.user.create({
      data: {
        email,
        displayName,
        supabaseId: data.user.id,
        role,
        status: UserStatus.ACTIVE,
        emailVerifiedAt: new Date(),
        termsAcceptedAt: new Date(),
        termsVersion: '1.0',
        privacyPolicyAcceptedAt: new Date(),
        privacyPolicyVersion: '1.0',
      },
    });

    logger.info({ email, role }, '[DEV] seeded verified user');
    res.status(201).json({ email, password, userId: user.id });
  } catch (err) {
    logger.error({ err }, '[DEV] seed-verified-user failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'seed failed', retryable: false } });
  }
});

devRouter.get('/verification-token', async (req: Request, res: Response) => {
  const email = typeof req.query.email === 'string' ? req.query.email : '';
  if (!email) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email query param required', retryable: false } });
  }
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return res.status(404).json({ error: { code: 'USER_NOT_FOUND', message: 'no user', retryable: false } });
  const token = await prisma.emailVerificationToken.findFirst({
    where: { userId: user.id, usedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!token) return res.status(404).json({ error: { code: 'TOKEN_NOT_FOUND', message: 'no active verification token', retryable: false } });
  res.json({ token: token.token, expiresAt: token.expiresAt.toISOString() });
});

devRouter.get('/invitation-token', async (req: Request, res: Response) => {
  const email = typeof req.query.email === 'string' ? req.query.email : '';
  if (!email) {
    return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'email query param required', retryable: false } });
  }
  const invite = await prisma.userInvitation.findFirst({
    where: { email, acceptedAt: null, revokedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!invite) return res.status(404).json({ error: { code: 'INVITATION_NOT_FOUND', message: 'no pending invitation', retryable: false } });
  res.json({ token: invite.token, role: invite.role, expiresAt: invite.expiresAt.toISOString() });
});

devRouter.post('/seed-event', async (req: Request, res: Response) => {
  try {
    const { cameraId, summary = 'Seeded E2E event', severity = 'LOW', type = 'motion' } = req.body as {
      cameraId: string;
      summary?: string;
      severity?: EventSeverity;
      type?: string;
    };
    if (!cameraId) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'cameraId required', retryable: false } });
    }
    const event = await prisma.event.create({
      data: {
        cameraId,
        summary,
        severity,
        type,
        timestampStart: new Date(),
      },
    });
    logger.info({ eventId: event.id, cameraId }, '[DEV] seeded event');
    res.status(201).json({ eventId: event.id, cameraId, summary });
  } catch (err) {
    logger.error({ err }, '[DEV] seed-event failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'seed failed', retryable: false } });
  }
});
