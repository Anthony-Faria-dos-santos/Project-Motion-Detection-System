import { Router } from 'express';
import { z } from 'zod';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { authenticate, authorize } from '../middleware/auth';

export const auditRouter: ReturnType<typeof Router> = Router();

// S9: Zod validation for audit query params
const auditQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  user: z.string().uuid().optional(),
  action: z.string().optional(),
  resource: z.string().optional(),
  dateFrom: z.string().datetime().optional(),
  dateTo: z.string().datetime().optional(),
}).partial();

auditRouter.get('/', authenticate, authorize('audit:read'), async (req, res) => {
  try {
    const query = auditQuerySchema.parse(req.query);
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.user) where.userId = query.user;
    if (query.action) where.action = query.action;
    if (query.resource) where.resource = query.resource;
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(query.dateFrom);
      if (query.dateTo) where.createdAt.lte = new Date(query.dateTo);
    }

    const [data, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { displayName: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    res.json({
      data: data.map((a) => ({
        id: a.id,
        userId: a.userId,
        userDisplayName: a.user.displayName,
        action: a.action,
        resource: a.resource,
        resourceId: a.resourceId,
        changes: a.before && a.after ? computeChanges(a.before, a.after) : null,
        ipAddress: a.ipAddress,
        userAgent: a.userAgent,
        createdAt: a.createdAt.toISOString(),
      })),
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: { code: 'AUDIT_VALIDATION_ERROR', message: err.errors[0].message, retryable: false } });
    }
    logger.error({ err }, 'Failed to list audit logs');
    res.status(500).json({ error: { code: 'SYSTEM_INTERNAL_ERROR', message: 'Failed to list audit logs', retryable: true } });
  }
});

function computeChanges(before: any, after: any): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes: Array<{ field: string; oldValue: unknown; newValue: unknown }> = [];
  const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);
  for (const key of allKeys) {
    if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
      changes.push({ field: key, oldValue: before[key], newValue: after[key] });
    }
  }
  return changes;
}
