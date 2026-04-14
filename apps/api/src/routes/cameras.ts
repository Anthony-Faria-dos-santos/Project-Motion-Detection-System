import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { redactSensitive } from '../lib/redact';
import { sanitizeUrl } from '../lib/sanitize';
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth';
import { verifyCamera } from '../middleware/resource-auth';

export const cameraRouter: ReturnType<typeof Router> = Router();

// FIX 2: SSRF protection — validate sourceUrl protocol and block internal IPs
const ALLOWED_PROTOCOLS = ['rtsp:', 'rtsps:', 'http:', 'https:'];
// In production, cleartext protocols are rejected entirely (TLS required).
const PRODUCTION_ALLOWED_PROTOCOLS = ['rtsps:', 'https:'];
const BLOCKED_IP_RANGES = [
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^127\./,
  /^0\./,
  /^localhost/i,
];

function isValidSourceUrl(url: string): boolean {
  // Allow webcam index (integer) in dev only — in prod, physical cams must be remote over TLS.
  if (/^\d+$/.test(url)) return process.env.NODE_ENV !== 'production';

  try {
    const parsed = new URL(url);
    if (!ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false;
    if (process.env.NODE_ENV === 'production') {
      if (!PRODUCTION_ALLOWED_PROTOCOLS.includes(parsed.protocol)) return false;
      if (BLOCKED_IP_RANGES.some(r => r.test(parsed.hostname))) return false;
    }
    return true;
  } catch {
    return false;
  }
}

const createCameraSchema = z.object({
  name: z.string().min(1).max(100),
  location: z.string().min(1).max(200),
  sourceUrl: z.string().min(1).refine(isValidSourceUrl, { message: 'Invalid source URL. Allowed protocols: rtsp, http, https, or webcam index.' }),
  streamUrl: z.string().url().optional(),
});

// S5: Validation schema for PATCH /cameras/:id
const updateCameraSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  location: z.string().min(1).max(200).optional(),
  sourceUrl: z.string().min(1).refine(isValidSourceUrl, { message: 'Invalid source URL. Allowed protocols: rtsp, http, https, or webcam index.' }).optional(),
  streamUrl: z.string().url().optional().nullable(),
  status: z.enum(['ONLINE', 'OFFLINE', 'BUFFERING', 'DEGRADED', 'PAUSED', 'RECONNECTING']).optional(),
}).strict(); // strict rejects unknown fields

// GET /api/cameras
cameraRouter.get('/', authenticate, async (_req, res) => {
  try {
    const cameras = await prisma.camera.findMany({
      orderBy: { name: 'asc' },
      include: { activeProfile: { select: { name: true } } },
    });
    res.json({
      data: cameras.map((c) => ({
        id: c.id,
        name: c.name,
        status: c.status.toLowerCase(),
        location: c.location,
        lastFrameAt: c.lastFrameAt?.toISOString() || null,
        fps: c.fps || 0,
        latencyMs: c.latencyMs || 0,
        activePresetName: c.activeProfile?.name || null,
        thumbnailUrl: c.thumbnailUrl,
        resolution: c.resolution,
      })),
      pagination: { page: 1, limit: cameras.length, total: cameras.length, totalPages: 1 },
    });
  } catch (err) {
    logger.error({ err }, 'Failed to list cameras');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to list cameras', retryable: true } });
  }
});

// GET /api/cameras/:id
cameraRouter.get('/:id', authenticate, verifyCamera, async (req, res) => {
  try {
    const camera = await prisma.camera.findUnique({
      where: { id: req.params.id as string },
      include: { activeProfile: true, zones: true },
    });
    if (!camera) {
      return res.status(404).json({ error: { code: 'CAMERA_NOT_FOUND', message: 'Camera not found', retryable: false } });
    }
    res.json({ ...camera, sourceUrl: sanitizeUrl(camera.sourceUrl) });
  } catch (err) {
    logger.error({ err }, 'Failed to get camera');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to get camera', retryable: true } });
  }
});

// POST /api/cameras
cameraRouter.post('/', authenticate, authorize('camera:create'), async (req: AuthenticatedRequest, res) => {
  try {
    const data = createCameraSchema.parse(req.body);
    const camera = await prisma.camera.create({ data: { ...data, location: data.location } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'camera:create',
        resource: 'camera',
        resourceId: camera.id,
        after: redactSensitive(data) as any,
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    logger.info({ cameraId: camera.id }, 'Camera created');
    res.status(201).json(camera);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'CAMERA_ALREADY_EXISTS', message: err.errors[0].message, retryable: false } });
    }
    logger.error({ err }, 'Failed to create camera');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to create camera', retryable: true } });
  }
});

// PATCH /api/cameras/:id
cameraRouter.patch('/:id', authenticate, authorize('camera:update'), verifyCamera, async (req: AuthenticatedRequest, res) => {
  try {
    const before = await prisma.camera.findUnique({ where: { id: req.params.id as string } });
    if (!before) {
      return res.status(404).json({ error: { code: 'CAMERA_NOT_FOUND', message: 'Camera not found', retryable: false } });
    }

    const data = updateCameraSchema.parse(req.body);
    const camera = await prisma.camera.update({ where: { id: req.params.id as string }, data });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'camera:update',
        resource: 'camera',
        resourceId: camera.id,
        before: redactSensitive(before) as any,
        after: redactSensitive(camera) as any,
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.json(camera);
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'CAMERA_VALIDATION_ERROR', message: err.errors[0].message, retryable: false } });
    }
    logger.error({ err }, 'Failed to update camera');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to update camera', retryable: true } });
  }
});

// DELETE /api/cameras/:id
cameraRouter.delete('/:id', authenticate, authorize('camera:delete'), verifyCamera, async (req: AuthenticatedRequest, res) => {
  try {
    const camera = await prisma.camera.findUnique({ where: { id: req.params.id as string } });
    if (!camera) {
      return res.status(404).json({ error: { code: 'CAMERA_NOT_FOUND', message: 'Camera not found', retryable: false } });
    }

    await prisma.camera.delete({ where: { id: req.params.id as string } });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'camera:delete',
        resource: 'camera',
        resourceId: req.params.id as string,
        before: redactSensitive(camera) as any,
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.status(204).send();
  } catch (err) {
    logger.error({ err }, 'Failed to delete camera');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to delete camera', retryable: true } });
  }
});
