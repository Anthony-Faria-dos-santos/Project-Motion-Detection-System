import { Router, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

export const onboardingRouter: ReturnType<typeof Router> = Router();

function getIp(req: Request): string | null {
  return typeof req.ip === 'string' ? req.ip : null;
}
function getUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : null;
}

const stepSchema = z.object({
  step: z.coerce.number().int().min(0).max(10),
});

// POST /api/auth/onboarding/step — update onboardingStep
onboardingRouter.post('/onboarding/step', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = stepSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Invalid step value', retryable: false } });
    }
    const { step } = parsed.data;
    const userId = req.user!.id;

    const before = await prisma.user.findUnique({ where: { id: userId }, select: { onboardingStep: true } });
    // Only allow forward progress (no going back)
    const newStep = Math.max(before?.onboardingStep ?? 0, step);

    await prisma.user.update({
      where: { id: userId },
      data: { onboardingStep: newStep },
    });

    res.json({ onboardingStep: newStep });
  } catch (err) {
    logger.error({ err }, 'Update onboarding step failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to update step', retryable: true } });
  }
});

// POST /api/auth/onboarding/complete — mark onboarding done
onboardingRouter.post('/onboarding/complete', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: {
        onboardingCompletedAt: now,
        onboardingStep: 5, // mark all 5 steps done
      },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'auth:onboarding_completed',
        resource: 'user',
        resourceId: userId,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
      },
    });
    res.json({ onboardingCompletedAt: now.toISOString() });
  } catch (err) {
    logger.error({ err }, 'Complete onboarding failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to complete onboarding', retryable: true } });
  }
});

// POST /api/auth/onboarding/skip — dismiss onboarding (mark complete without step progression)
onboardingRouter.post('/onboarding/skip', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const now = new Date();
    await prisma.user.update({
      where: { id: userId },
      data: { onboardingCompletedAt: now },
    });
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'auth:onboarding_skipped',
        resource: 'user',
        resourceId: userId,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
      },
    });
    res.json({ onboardingCompletedAt: now.toISOString() });
  } catch (err) {
    logger.error({ err }, 'Skip onboarding failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to skip onboarding', retryable: true } });
  }
});
