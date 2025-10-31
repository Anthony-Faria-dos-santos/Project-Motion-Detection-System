import { Router } from 'express';
import { prisma } from '../lib/prisma';
import { authenticate } from '../middleware/auth';

export const healthRouter: ReturnType<typeof Router> = Router();

// Public: minimal health check for uptime monitors
healthRouter.get('/ping', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Authenticated: detailed health with camera stats, DB check
healthRouter.get('/', authenticate, async (_req, res) => {
  const checks: Array<{ name: string; status: string; latencyMs: number | null }> = [];

  // DB check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.push({ name: 'Database', status: 'up', latencyMs: Date.now() - dbStart });
  } catch {
    checks.push({ name: 'Database', status: 'down', latencyMs: null });
  }

  // Camera stats
  const [cameraStats] = await Promise.all([
    prisma.camera.groupBy({
      by: ['status'],
      _count: { id: true },
    }).catch(() => []),
  ]);

  const cameraCounts = { online: 0, offline: 0, degraded: 0, total: 0 };
  if (Array.isArray(cameraStats)) {
    for (const stat of cameraStats) {
      const count = stat._count.id;
      cameraCounts.total += count;
      if (stat.status === 'ONLINE') cameraCounts.online = count;
      else if (stat.status === 'OFFLINE') cameraCounts.offline = count;
      else if (stat.status === 'DEGRADED') cameraCounts.degraded = count;
    }
  }

  const allUp = checks.every((c) => c.status === 'up');
  const anyDown = checks.some((c) => c.status === 'down');

  res.json({
    status: anyDown ? 'critical' : allUp ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    services: checks.map((c) => ({ ...c, lastCheckAt: new Date().toISOString() })),
    cameras: cameraCounts,
    resources: { cpuPercent: 0, gpuPercent: null, ramMb: 0, ramTotalMb: 0, diskPercent: 0 },
    inference: { modelName: 'unknown', latencyP50Ms: 0, latencyP95Ms: 0, throughputFps: 0, queueDepth: 0, droppedFrames24h: 0 },
    recentErrors: [],
  });
});
