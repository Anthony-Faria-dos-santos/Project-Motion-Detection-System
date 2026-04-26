import { Router } from 'express';
import { z } from 'zod';

import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, authorize, type AuthenticatedRequest } from '../middleware/auth';
import { verifyEvent } from '../middleware/resource-auth';

export const eventRouter: ReturnType<typeof Router> = Router();

// S9: Zod validation for event query params
const eventQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  camera: z.string().uuid().optional(),
  severity: z.enum(['info', 'low', 'medium', 'high', 'critical']).optional(),
  type: z.string().optional(),
  reviewStatus: z.enum(['unreviewed', 'confirmed', 'false_positive', 'ignored', 'escalated']).optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}).partial();

// S11: Zod validation for event review body
const reviewSchema = z.object({
  status: z.enum(['confirmed', 'false_positive', 'ignored', 'escalated']),
  notes: z.string().max(2000).optional(),
});

// GET /api/events — paginated, filterable
eventRouter.get('/', authenticate, async (req, res) => {
  try {
    const query = eventQuerySchema.parse(req.query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.camera) where.cameraId = query.camera;
    if (query.severity) where.severity = query.severity.toUpperCase();
    if (query.type) where.type = query.type;
    if (query.reviewStatus) where.reviewStatus = query.reviewStatus.toUpperCase().replace(' ', '_');
    if (query.dateFrom || query.dateTo) {
      where.timestampStart = {};
      if (query.dateFrom) where.timestampStart.gte = new Date(query.dateFrom);
      if (query.dateTo) where.timestampStart.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      prisma.event.findMany({
        where,
        skip,
        take: limit,
        orderBy: { timestampStart: 'desc' },
        include: { camera: { select: { name: true } } },
      }),
      prisma.event.count({ where }),
    ]);

    res.json({
      data: data.map((e) => ({
        id: e.id,
        type: e.type,
        severity: e.severity.toLowerCase(),
        summary: e.summary,
        cameraId: e.cameraId,
        cameraName: e.camera.name,
        timestampStart: e.timestampStart.toISOString(),
        reviewStatus: e.reviewStatus.toLowerCase().replace('_', '-'),
        snapshotUrl: e.snapshotUrl,
        objectClass: (e.metadata as any)?.className || null,
        confidence: (e.metadata as any)?.confidence || null,
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'EVENT_VALIDATION_ERROR', message: err.errors[0].message, retryable: false } });
    }
    logger.error({ err }, 'Failed to list events');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to list events', retryable: true } });
  }
});

// GET /api/events/:id
eventRouter.get('/:id', authenticate, verifyEvent, async (req, res) => {
  try {
    const event = await prisma.event.findUnique({
      where: { id: req.params.id as string },
      include: {
        camera: { select: { id: true, name: true, status: true, location: true } },
        tracks: true,
        rule: { select: { id: true, name: true } },
      },
    });
    if (!event) {
      return res.status(404).json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found', retryable: false } });
    }
    res.json({
      ...event,
      severity: event.severity.toLowerCase(),
      reviewStatus: event.reviewStatus.toLowerCase(),
      timestampStart: event.timestampStart.toISOString(),
      timestampEnd: event.timestampEnd?.toISOString() || null,
      createdAt: event.createdAt.toISOString(),
    });
  } catch (err) {
    logger.error({ err }, 'Failed to get event');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to get event', retryable: true } });
  }
});

// PATCH /api/events/:id/review
eventRouter.patch('/:id/review', authenticate, authorize('event:review'), verifyEvent, async (req: AuthenticatedRequest, res) => {
  try {
    const { status, notes } = reviewSchema.parse(req.body);

    const before = await prisma.event.findUnique({ where: { id: req.params.id as string } });
    if (!before) {
      return res.status(404).json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found', retryable: false } });
    }

    const event = await prisma.event.update({
      where: { id: req.params.id as string },
      data: {
        reviewStatus: status.toUpperCase().replace(' ', '_') as any,
        reviewedBy: req.user!.id,
        reviewedAt: new Date(),
        reviewNotes: notes || null,
      },
    });

    await prisma.auditLog.create({
      data: {
        userId: req.user!.id,
        action: 'event:review',
        resource: 'event',
        resourceId: event.id,
        before: { reviewStatus: before.reviewStatus },
        after: { reviewStatus: event.reviewStatus, reviewNotes: notes },
        ipAddress: (req.ip as string) || null,
        userAgent: (req.headers['user-agent'] as string) || null,
      },
    });

    res.json({ ...event, severity: event.severity.toLowerCase(), reviewStatus: event.reviewStatus.toLowerCase() });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'EVENT_VALIDATION_ERROR', message: err.errors[0].message, retryable: false } });
    }
    logger.error({ err }, 'Failed to review event');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to review event', retryable: true } });
  }
});
