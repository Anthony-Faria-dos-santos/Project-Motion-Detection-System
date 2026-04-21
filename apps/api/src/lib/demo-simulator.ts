import type { Server as SocketIOServer } from 'socket.io';
import { prisma } from './prisma';
import { logger } from './logger';

interface ScriptedEvent {
  offsetSec: number;
  type: string;
  severity: 'INFO' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  summary: string;
  objectClass: string;
  box: [number, number, number, number];
}

interface CameraLoopState {
  cameraId: string;
  clipUrl: string;
  loopDurationMs: number;
  script: ScriptedEvent[];
  subscriberCount: number;
  intervalId: NodeJS.Timeout | null;
  currentLoopEpoch: number;
  lastPlayedOffsetSec: number;
}

const LOOP_DURATION_MS = 60_000;
const TICK_INTERVAL_MS = 1_000;

function isScriptedEventArray(value: unknown): value is ScriptedEvent[] {
  return (
    Array.isArray(value) &&
    value.every(
      (e) =>
        typeof e === 'object' &&
        e !== null &&
        typeof (e as { offsetSec?: unknown }).offsetSec === 'number' &&
        typeof (e as { summary?: unknown }).summary === 'string',
    )
  );
}

export class DemoSimulator {
  private io: SocketIOServer;
  private states = new Map<string, CameraLoopState>();
  private socketSubscriptions = new Map<string, Set<string>>();

  constructor(io: SocketIOServer) {
    this.io = io;
  }

  async registerSubscription(socketId: string, cameraId: string): Promise<void> {
    const camera = await prisma.camera.findUnique({
      where: { id: cameraId },
      select: { demoClipUrl: true, demoEventScript: true },
    });
    if (!camera?.demoClipUrl || !isScriptedEventArray(camera.demoEventScript)) return;

    const subs = this.socketSubscriptions.get(socketId) ?? new Set();
    subs.add(cameraId);
    this.socketSubscriptions.set(socketId, subs);

    let state = this.states.get(cameraId);
    if (!state) {
      const now = Date.now();
      state = {
        cameraId,
        clipUrl: camera.demoClipUrl,
        loopDurationMs: LOOP_DURATION_MS,
        script: camera.demoEventScript,
        subscriberCount: 0,
        intervalId: null,
        currentLoopEpoch: now,
        lastPlayedOffsetSec: -1,
      };
      this.states.set(cameraId, state);
    }
    state.subscriberCount += 1;
    if (!state.intervalId) {
      state.intervalId = setInterval(() => {
        this.tick(cameraId).catch((err) =>
          logger.error({ err, cameraId }, '[DemoSimulator] tick failed'),
        );
      }, TICK_INTERVAL_MS);
    }

    this.io.to(socketId).emit('camera:demo_feed', {
      cameraId,
      clipUrl: state.clipUrl,
      loopDurationMs: state.loopDurationMs,
      loopStartEpoch: state.currentLoopEpoch,
      script: state.script,
    });
  }

  unregisterSubscription(socketId: string, cameraId: string): void {
    const subs = this.socketSubscriptions.get(socketId);
    if (subs) {
      subs.delete(cameraId);
      if (subs.size === 0) this.socketSubscriptions.delete(socketId);
    }
    const state = this.states.get(cameraId);
    if (!state) return;
    state.subscriberCount -= 1;
    if (state.subscriberCount <= 0) {
      if (state.intervalId) clearInterval(state.intervalId);
      this.states.delete(cameraId);
    }
  }

  disconnectSocket(socketId: string): void {
    const subs = this.socketSubscriptions.get(socketId);
    if (!subs) return;
    for (const cameraId of Array.from(subs)) {
      this.unregisterSubscription(socketId, cameraId);
    }
  }

  private async tick(cameraId: string): Promise<void> {
    const state = this.states.get(cameraId);
    if (!state || state.subscriberCount <= 0) return;

    const now = Date.now();
    const elapsedMs = now - state.currentLoopEpoch;
    if (elapsedMs >= state.loopDurationMs) {
      state.currentLoopEpoch = now - (elapsedMs % state.loopDurationMs);
      state.lastPlayedOffsetSec = -1;
    }
    const currentOffsetSec = (now - state.currentLoopEpoch) / 1000;

    for (const scripted of state.script) {
      if (
        scripted.offsetSec <= currentOffsetSec &&
        scripted.offsetSec > state.lastPlayedOffsetSec
      ) {
        state.lastPlayedOffsetSec = scripted.offsetSec;
        await this.emitScriptedEvent(cameraId, state.clipUrl, scripted);
      }
    }
  }

  private async emitScriptedEvent(
    cameraId: string,
    clipUrl: string,
    scripted: ScriptedEvent,
  ): Promise<void> {
    try {
      const event = await prisma.event.create({
        data: {
          type: scripted.type,
          severity: scripted.severity,
          summary: scripted.summary,
          cameraId,
          metadata: {
            objectClass: scripted.objectClass,
            box: scripted.box,
            offsetSec: scripted.offsetSec,
            demoSource: true,
          },
          clipUrl,
          timestampStart: new Date(),
        },
      });
      const camera = await prisma.camera.findUnique({
        where: { id: cameraId },
        select: { name: true },
      });
      this.io.to(`camera:${cameraId}`).emit('event:new', {
        id: event.id,
        type: event.type,
        severity: event.severity.toLowerCase(),
        summary: event.summary,
        cameraName: camera?.name ?? cameraId,
        timestampStart: event.timestampStart.toISOString(),
        reviewStatus: 'unreviewed',
        clipUrl: event.clipUrl,
        objectClass: scripted.objectClass,
      });
      this.io.to(`camera:${cameraId}`).emit('camera:tracks', {
        cameraId,
        tracks: [
          {
            id: `demo-${scripted.offsetSec}`,
            className: scripted.objectClass,
            confidence: 0.92,
            box: scripted.box,
          },
        ],
        capturedAt: new Date().toISOString(),
      });
    } catch (err) {
      logger.error({ err, cameraId, scripted }, '[DemoSimulator] emit failed');
    }
  }
}

let simulator: DemoSimulator | null = null;

export function initDemoSimulator(io: SocketIOServer): DemoSimulator {
  if (!simulator) simulator = new DemoSimulator(io);
  return simulator;
}

export function getDemoSimulator(): DemoSimulator | null {
  return simulator;
}
