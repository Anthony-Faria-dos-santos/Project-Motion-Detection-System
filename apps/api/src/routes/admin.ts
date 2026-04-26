import { Router, Request } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, requireRole, type AuthenticatedRequest } from '../middleware/auth';
import { Role, UserStatus, CameraStatus } from '@prisma/client';

export const adminRouter: ReturnType<typeof Router> = Router();

function getIp(req: Request): string | null {
  return typeof req.ip === 'string' ? req.ip : null;
}
function getUserAgent(req: Request): string | null {
  const ua = req.headers['user-agent'];
  return typeof ua === 'string' ? ua : null;
}

const broadcastSchema = z.object({
  title: z.string().min(1).max(120),
  body: z.string().min(1).max(2000),
  severity: z.enum(['info', 'warning', 'critical']).default('info'),
  endsAt: z.string().datetime().nullable().optional(),
  dismissible: z.boolean().default(true),
});

const featureFlagSchema = z.object({
  key: z.string().min(1).max(64).regex(/^[a-z0-9_]+$/, 'lowercase letters, digits and underscores only'),
  enabled: z.boolean(),
  description: z.string().max(500).optional(),
});

// ── GET /api/admin/system-stats (SUPER_ADMIN) ──

adminRouter.get('/system-stats', authenticate, requireRole(Role.SUPER_ADMIN), async (_req, res) => {
  try {
    const [
      totalUsers,
      activeUsers,
      pendingUsers,
      suspendedUsers,
      lockedUsers,
      mfaEnabledUsers,
      superAdminCount,
      totalCameras,
      onlineCameras,
      offlineCameras,
      degradedCameras,
      totalEvents,
      eventsLast24h,
      criticalEventsLast24h,
      unreviewedEvents,
      totalIncidents,
      auditLogsLast24h,
      activeRefreshTokens,
      activeBroadcasts,
      featureFlagsCount,
      passkeysCount,
      linkedAccountsCount,
      pendingInvitationsCount,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { status: UserStatus.ACTIVE } }),
      prisma.user.count({ where: { status: UserStatus.PENDING_VERIFICATION } }),
      prisma.user.count({ where: { status: UserStatus.SUSPENDED } }),
      prisma.user.count({ where: { status: UserStatus.LOCKED } }),
      prisma.user.count({ where: { mfaEnabled: true } }),
      prisma.user.count({ where: { role: Role.SUPER_ADMIN, status: UserStatus.ACTIVE } }),
      prisma.camera.count(),
      prisma.camera.count({ where: { status: CameraStatus.ONLINE } }),
      prisma.camera.count({ where: { status: CameraStatus.OFFLINE } }),
      prisma.camera.count({ where: { status: CameraStatus.DEGRADED } }),
      prisma.event.count(),
      prisma.event.count({ where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.event.count({ where: { severity: 'CRITICAL', createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.event.count({ where: { reviewStatus: 'UNREVIEWED' } }),
      prisma.incident.count(),
      prisma.auditLog.count({ where: { createdAt: { gt: new Date(Date.now() - 24 * 60 * 60 * 1000) } } }),
      prisma.refreshToken.count({ where: { revokedAt: null, expiresAt: { gt: new Date() } } }),
      prisma.systemMessage.count({ where: { active: true } }),
      prisma.featureFlag.count(),
      prisma.passkey.count(),
      prisma.linkedAccount.count(),
      prisma.userInvitation.count({ where: { acceptedAt: null, revokedAt: null, expiresAt: { gt: new Date() } } }),
    ]);

    const memoryUsage = process.memoryUsage();
    const uptimeSec = Math.round(process.uptime());

    res.json({
      generatedAt: new Date().toISOString(),
      users: {
        total: totalUsers,
        active: activeUsers,
        pending: pendingUsers,
        suspended: suspendedUsers,
        locked: lockedUsers,
        mfaEnabled: mfaEnabledUsers,
        mfaPercent: totalUsers > 0 ? Math.round((mfaEnabledUsers / totalUsers) * 100) : 0,
        superAdminCount,
      },
      cameras: {
        total: totalCameras,
        online: onlineCameras,
        offline: offlineCameras,
        degraded: degradedCameras,
      },
      events: {
        total: totalEvents,
        last24h: eventsLast24h,
        criticalLast24h: criticalEventsLast24h,
        unreviewed: unreviewedEvents,
      },
      incidents: {
        total: totalIncidents,
      },
      sessions: {
        activeRefreshTokens,
      },
      auth: {
        passkeysCount,
        linkedAccountsCount,
        pendingInvitationsCount,
      },
      audit: {
        last24h: auditLogsLast24h,
      },
      system: {
        activeBroadcasts,
        featureFlagsCount,
        backendUptimeSec: uptimeSec,
        backendMemoryRssMb: Math.round(memoryUsage.rss / 1024 / 1024),
        backendMemoryHeapUsedMb: Math.round(memoryUsage.heapUsed / 1024 / 1024),
        nodeVersion: process.version,
      },
    });
  } catch (err) {
    logger.error({ err }, 'System stats failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to load stats', retryable: true } });
  }
});

// ── GET /api/admin/broadcasts (active list, public) ──

adminRouter.get('/broadcasts/active', async (_req, res) => {
  try {
    const now = new Date();
    const broadcasts = await prisma.systemMessage.findMany({
      where: {
        active: true,
        startsAt: { lte: now },
        OR: [{ endsAt: null }, { endsAt: { gt: now } }],
      },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });
    res.json({
      items: broadcasts.map((b) => ({
        id: b.id,
        title: b.title,
        body: b.body,
        severity: b.severity,
        dismissible: b.dismissible,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt?.toISOString() || null,
      })),
    });
  } catch (err) {
    logger.error({ err }, 'List active broadcasts failed');
    res.json({ items: [] });
  }
});

// ── GET /api/admin/broadcasts (full list, SUPER_ADMIN) ──

adminRouter.get('/broadcasts', authenticate, requireRole(Role.SUPER_ADMIN), async (_req, res) => {
  try {
    const broadcasts = await prisma.systemMessage.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    res.json({
      items: broadcasts.map((b) => ({
        id: b.id,
        title: b.title,
        body: b.body,
        severity: b.severity,
        active: b.active,
        dismissible: b.dismissible,
        startsAt: b.startsAt.toISOString(),
        endsAt: b.endsAt?.toISOString() || null,
        createdAt: b.createdAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'List broadcasts failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed', retryable: true } });
  }
});

// ── POST /api/admin/broadcasts (SUPER_ADMIN) ──

adminRouter.post('/broadcasts', authenticate, requireRole(Role.SUPER_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const parsed = broadcastSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input', retryable: false } });
    }
    const { title, body, severity, endsAt, dismissible } = parsed.data;
    const message = await prisma.systemMessage.create({
      data: {
        title,
        body,
        severity,
        endsAt: endsAt ? new Date(endsAt) : null,
        dismissible,
        createdById: req.user!.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'admin:broadcast_created',
        resource: 'system_message',
        resourceId: message.id,
        ipAddress: getIp(req),
        userAgent: getUserAgent(req),
        comment: `Broadcast: ${title}`,
      },
    });
    res.status(201).json({ id: message.id, title: message.title });
  } catch (err) {
    logger.error({ err }, 'Create broadcast failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to broadcast', retryable: true } });
  }
});

// ── DELETE /api/admin/broadcasts/:id (SUPER_ADMIN, soft = active=false) ──

adminRouter.delete('/broadcasts/:id', authenticate, requireRole(Role.SUPER_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const id = req.params.id as string;
    const message = await prisma.systemMessage.findUnique({ where: { id } });
    if (!message) {
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: 'Broadcast not found', retryable: false } });
    }
    await prisma.systemMessage.update({
      where: { id },
      data: { active: false },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'admin:broadcast_deactivated',
        resource: 'system_message',
        resourceId: id,
        ipAddress: getIp(req),
      },
    });
    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Deactivate broadcast failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed', retryable: true } });
  }
});

// ── Feature flags ──

adminRouter.get('/feature-flags', authenticate, requireRole(Role.SUPER_ADMIN), async (_req, res) => {
  try {
    const flags = await prisma.featureFlag.findMany({ orderBy: { key: 'asc' } });
    res.json({
      items: flags.map((f) => ({
        key: f.key,
        enabled: f.enabled,
        description: f.description,
        updatedAt: f.updatedAt.toISOString(),
      })),
    });
  } catch (err) {
    logger.error({ err }, 'List flags failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed', retryable: true } });
  }
});

adminRouter.put('/feature-flags/:key', authenticate, requireRole(Role.SUPER_ADMIN), async (req: AuthenticatedRequest, res) => {
  try {
    const key = req.params.key as string;
    const parsed = featureFlagSchema.safeParse({ key, ...req.body });
    if (!parsed.success) {
      return res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: parsed.error.issues[0]?.message || 'Invalid input', retryable: false } });
    }
    const flag = await prisma.featureFlag.upsert({
      where: { key },
      create: {
        key,
        enabled: parsed.data.enabled,
        description: parsed.data.description || null,
        updatedById: req.user!.id,
      },
      update: {
        enabled: parsed.data.enabled,
        description: parsed.data.description || null,
        updatedById: req.user!.id,
      },
    });
    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'admin:feature_flag_updated',
        resource: 'feature_flag',
        resourceId: key,
        after: { enabled: parsed.data.enabled },
        ipAddress: getIp(req),
      },
    });
    res.json({ key: flag.key, enabled: flag.enabled });
  } catch (err) {
    logger.error({ err }, 'Update flag failed');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed', retryable: true } });
  }
});
