import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

export const gdprRouter: ReturnType<typeof Router> = Router();

// GET /api/gdpr/me — Data Subject Access Request (DSAR)
gdprRouter.get('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const [user, auditLogs, events] = await Promise.all([
      prisma.user.findUnique({ where: { id: userId } }),
      prisma.auditLog.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
      prisma.event.findMany({
        where: { reviewedBy: userId },
        orderBy: { createdAt: 'desc' },
        take: 1000,
      }),
    ]);

    res.json({
      exportDate: new Date().toISOString(),
      user: user ? {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        status: user.status,
        createdAt: user.createdAt.toISOString(),
      } : null,
      auditLogs: auditLogs.map(a => ({
        action: a.action,
        resource: a.resource,
        ipAddress: a.ipAddress,
        createdAt: a.createdAt.toISOString(),
      })),
      reviewedEvents: events.map(e => ({
        id: e.id,
        type: e.type,
        reviewStatus: e.reviewStatus,
        reviewedAt: e.reviewedAt?.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'GDPR export failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Export failed', retryable: true } });
  }
});

// GET /api/gdpr/export — Portable data export (JSON)
gdprRouter.get('/export', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;

    const user = await prisma.user.findUnique({ where: { id: userId } });
    const auditLogs = await prisma.auditLog.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } });

    res.setHeader('Content-Disposition', `attachment; filename="motionops-data-export-${userId}.json"`);
    res.setHeader('Content-Type', 'application/json');
    res.json({
      format: 'MotionOps GDPR Export v1',
      exportDate: new Date().toISOString(),
      user: user ? { email: user.email, displayName: user.displayName, role: user.role, createdAt: user.createdAt.toISOString() } : null,
      activityLog: auditLogs.map(a => ({
        date: a.createdAt.toISOString(),
        action: a.action,
        resource: a.resource,
        ip: a.ipAddress,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'GDPR portable export failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Export failed', retryable: true } });
  }
});

// DELETE /api/gdpr/me — Right to erasure (pseudonymization)
gdprRouter.delete('/me', authenticate, async (req: AuthenticatedRequest, res) => {
  try {
    const userId = req.user!.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });

    if (!user) {
      return res.status(404).json({ error: { code: 'AUTH_INVALID_TOKEN', message: 'User not found', retryable: false } });
    }

    // Pseudonymize — don't delete, replace PII with hashes
    const pseudonym = `deleted_${userId.slice(0, 8)}`;
    await prisma.user.update({
      where: { id: userId },
      data: {
        email: `${pseudonym}@deleted.motionops.local`,
        displayName: 'Deleted User',
        status: 'deleted',
      },
    });

    // Revoke all refresh tokens
    await prisma.refreshToken.updateMany({
      where: { userId, revokedAt: null },
      data: { revokedAt: new Date() },
    });

    // Audit the deletion (this audit entry remains — legal requirement)
    await prisma.auditLog.create({
      data: {
        userId,
        action: 'gdpr:erasure',
        resource: 'user',
        resourceId: userId,
        before: { email: user.email, displayName: user.displayName },
        after: { email: `${pseudonym}@deleted.motionops.local`, displayName: 'Deleted User' },
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    logger.info({ userId }, 'GDPR erasure completed (pseudonymized)');
    res.json({ message: 'Your data has been pseudonymized. Account is no longer accessible.' });
  } catch (err) {
    logger.error({ err }, 'GDPR erasure failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Erasure failed', retryable: true } });
  }
});
