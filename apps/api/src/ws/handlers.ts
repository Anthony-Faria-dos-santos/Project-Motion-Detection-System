import { Server as SocketIOServer } from 'socket.io';
import jwt from 'jsonwebtoken';
import { prisma } from '../lib/prisma';
import { logger } from '../lib/logger';
import { getPermissionsForRole } from '../lib/permissions';

export function setupSocketHandlers(io: SocketIOServer): void {
  // S2: WebSocket authentication middleware
  io.use(async (socket, next) => {
    // Worker auth: check for WORKER_API_KEY
    if (socket.handshake.auth?.workerKey === process.env.WORKER_API_KEY) {
      (socket as any).isWorker = true;
      return next();
    }

    const token = socket.handshake.auth?.token;
    if (!token) {
      return next(new Error('AUTH_MISSING_TOKEN'));
    }
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { sub: string };
      const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
      if (!user) return next(new Error('AUTH_INVALID_TOKEN'));
      (socket as any).user = { id: user.id, role: user.role };
      next();
    } catch {
      next(new Error('AUTH_INVALID_TOKEN'));
    }
  });

  io.on('connection', (socket) => {
    logger.info({ socketId: socket.id, isWorker: !!(socket as any).isWorker }, 'Client connected');

    socket.on('camera:subscribe', ({ cameraId }: { cameraId: string }) => {
      // Workers can always subscribe; users need camera:read permission
      if (!(socket as any).isWorker) {
        const user = (socket as any).user;
        const permissions = getPermissionsForRole(user?.role || '');
        if (!permissions.includes('camera:read')) {
          socket.emit('error', { code: 'AUTH_FORBIDDEN', message: 'Missing camera:read permission' });
          return;
        }
      }
      socket.join(`camera:${cameraId}`);
      logger.info({ socketId: socket.id, cameraId }, 'Subscribed to camera');
    });

    socket.on('camera:unsubscribe', ({ cameraId }: { cameraId: string }) => {
      socket.leave(`camera:${cameraId}`);
    });

    socket.on('admin:subscribe', () => {
      // Only ADMIN and SUPER_ADMIN can subscribe to admin channel
      if ((socket as any).isWorker) {
        socket.emit('error', { code: 'AUTH_FORBIDDEN', message: 'Workers cannot subscribe to admin channel' });
        return;
      }
      const user = (socket as any).user;
      if (!user || !['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
        socket.emit('error', { code: 'AUTH_FORBIDDEN', message: 'Admin role required' });
        return;
      }
      socket.join('admin');
    });

    socket.on('health:subscribe', () => {
      socket.join('health');
    });

    // Worker event processing — create Event from event_candidate
    socket.on('worker:event_candidate', async (data: any) => {
      if (!(socket as any).isWorker) return; // only workers can emit events

      try {
        const [event, camera] = await Promise.all([
          prisma.event.create({
            data: {
              type: data.type || 'object_detected',
              severity: (data.severity || 'info').toUpperCase() as any,
              summary: data.summary || 'Detection event',
              cameraId: data.cameraId,
              metadata: data.metadata || null,
              snapshotUrl: data.snapshotPath || null,
              timestampStart: new Date(data.timestamp || Date.now()),
            },
          }),
          prisma.camera.findUnique({
            where: { id: data.cameraId },
            select: { name: true },
          }),
        ]);

        io.to(`camera:${data.cameraId}`).emit('event:new', {
          id: event.id,
          type: event.type,
          severity: event.severity.toLowerCase(),
          summary: event.summary,
          cameraName: camera?.name ?? data.cameraId,
          timestampStart: event.timestampStart.toISOString(),
          reviewStatus: 'unreviewed',
          snapshotUrl: event.snapshotUrl,
          objectClass: (data.metadata as any)?.className || null,
          confidence: (data.metadata as any)?.confidence || null,
        });

        logger.info({ eventId: event.id, cameraId: data.cameraId }, 'Event created from worker candidate');
      } catch (err) {
        logger.error({ err, data }, 'Failed to create event from worker candidate');
      }
    });

    // Worker frame — forward JPEG/base64 (or presigned URL) payload to subscribers
    socket.on('worker:frame', (data: any) => {
      if (!(socket as any).isWorker) return;
      if (!data?.cameraId) return;
      io.to(`camera:${data.cameraId}`).emit('camera:frame', {
        cameraId: data.cameraId,
        frame: data.frame ?? null,
        frameUrl: data.frameUrl ?? null,
        width: data.width ?? null,
        height: data.height ?? null,
        fps: data.fps ?? null,
        capturedAt: data.capturedAt ?? new Date().toISOString(),
      });
    });

    // Worker tracks — forward active bounding boxes + track ids to subscribers
    socket.on('worker:tracks', (data: any) => {
      if (!(socket as any).isWorker) return;
      if (!data?.cameraId) return;
      io.to(`camera:${data.cameraId}`).emit('camera:tracks', {
        cameraId: data.cameraId,
        tracks: Array.isArray(data.tracks) ? data.tracks : [],
        capturedAt: data.capturedAt ?? new Date().toISOString(),
      });
    });

    // Worker health — update camera status in DB
    socket.on('worker:camera_status', async (data: any) => {
      if (!(socket as any).isWorker) return;

      try {
        await prisma.camera.updateMany({
          where: { sourceUrl: data.cameraId }, // match by sourceUrl since worker uses camera_source
          data: {
            status: data.status?.toUpperCase() as any || 'ONLINE',
            fps: data.fps || null,
            resolution: data.resolution || null,
            latencyMs: data.latencyMs || null,
            lastHeartbeat: new Date(),
            lastFrameAt: data.lastFrameAt ? new Date(data.lastFrameAt) : null,
          },
        });
      } catch (err) {
        logger.error({ err }, 'Failed to update camera status');
      }
    });

    socket.on('disconnect', () => {
      logger.info({ socketId: socket.id }, 'Client disconnected');
    });
  });
}
