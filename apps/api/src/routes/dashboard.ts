import { Router, Response } from 'express';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, type AuthenticatedRequest } from '../middleware/auth';

export const dashboardRouter: ReturnType<typeof Router> = Router();

// GET /api/dashboard/kpis
//
// Returns the scalar metrics that the frontend dashboard top-strip renders.
// - activeCameras       : cameras currently in ONLINE status for the caller
// - alertsToday         : events raised since midnight (caller-scoped)
// - activeTracksNow     : in-flight tracks (populated by worker-cv; 0 when no worker is connected)
// - avgLatencyMs        : rolling P50 inference latency (0 until metrics pipeline ships)
// - droppedFrames15m    : dropped frames over the last 15 min (0 until metrics pipeline ships)
//
// The placeholders (activeTracksNow, avgLatencyMs, droppedFrames15m) remain 0 until the
// worker-cv metrics ingestion exists. Returning them keeps the contract stable for the
// frontend and lets us wire real values later without a types change.
dashboardRouter.get('/kpis', authenticate, async (_req: AuthenticatedRequest, res: Response) => {
  try {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [activeCameras, alertsToday] = await Promise.all([
      prisma.camera.count({ where: { status: 'ONLINE' } }),
      prisma.event.count({ where: { timestampStart: { gte: todayStart } } }),
    ]);

    res.json({
      activeCameras,
      alertsToday,
      activeTracksNow: 0,
      avgLatencyMs: 0,
      droppedFrames15m: 0,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Dashboard KPIs query failed');
    res.status(500).json({
      error: {
        code: 'SYSTEM_UNAVAILABLE',
        message: 'Unable to compute dashboard KPIs at the moment.',
        retryable: true,
      },
    });
  }
});
