import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import type { AuthenticatedRequest } from './auth';

/**
 * Verify the requested camera exists.
 * For MVP: all authenticated users can access all cameras.
 * Future: add organizationId/scope check here.
 */
export async function verifyCamera(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const cameraId = (req.params.id || req.params.cameraId) as string | undefined;
  if (!cameraId) {
    next();
    return;
  }

  const camera = await prisma.camera.findUnique({ where: { id: cameraId }, select: { id: true } });
  if (!camera) {
    res.status(404).json({ error: { code: 'CAMERA_NOT_FOUND', message: 'Camera not found', retryable: false } });
    return;
  }

  // Future: check user.organizationId === camera.organizationId
  next();
}

/**
 * Verify the requested event exists.
 */
export async function verifyEvent(req: AuthenticatedRequest, res: Response, next: NextFunction): Promise<void> {
  const eventId = req.params.id as string | undefined;
  if (!eventId) {
    next();
    return;
  }

  const event = await prisma.event.findUnique({ where: { id: eventId }, select: { id: true } });
  if (!event) {
    res.status(404).json({ error: { code: 'EVENT_NOT_FOUND', message: 'Event not found', retryable: false } });
    return;
  }

  next();
}
