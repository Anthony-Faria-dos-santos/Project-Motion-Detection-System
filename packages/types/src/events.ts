import type { CameraStatus, EventSeverity, ReviewStatus, StreamStatus } from './enums';

// Server → Client events
export interface ServerEvents {
  'system:health': (payload: SystemHealthPayload) => void;
  'camera:status': (payload: CameraStatusPayload) => void;
  'camera:scene': (payload: CameraScenePayload) => void;
  'detection:created': (payload: DetectionPayload) => void;
  'track:updated': (payload: TrackUpdatePayload) => void;
  'event:new': (payload: EventNewPayload) => void;
  'event:reviewed': (payload: EventReviewedPayload) => void;
  'config:applied': (payload: ConfigAppliedPayload) => void;
  'config:failed': (payload: ConfigFailedPayload) => void;
}

// Client → Server events
export interface ClientEvents {
  'camera:subscribe': (payload: { cameraId: string }) => void;
  'camera:unsubscribe': (payload: { cameraId: string }) => void;
  'admin:subscribe': () => void;
  'health:subscribe': () => void;
}

export interface SystemHealthPayload {
  services: Array<{ name: string; status: 'up' | 'down' | 'degraded' }>;
  cameras: { online: number; offline: number; total: number };
  resources: { cpuPercent: number; gpuPercent: number | null; ramMb: number };
  timestamp: string;
}

export interface CameraStatusPayload {
  cameraId: string;
  status: CameraStatus;
  fps: number | null;
  latencyMs: number | null;
  lastFrameAt: string;
  droppedFrames: number;
}

export interface CameraScenePayload {
  cameraId: string;
  streamStatus: StreamStatus;
  activeTracksCount: number;
  detectionsCount: number;
  currentMode: string;
  lastAlertAt: string | null;
}

export interface DetectionPayload {
  id: string;
  cameraId: string;
  type: string;
  bbox: { x: number; y: number; w: number; h: number };
  confidence: number;
  className: string;
  timestamp: string;
}

export interface TrackUpdatePayload {
  trackId: string;
  cameraId: string;
  sourceTrackId: string;
  className: string;
  positions: Array<{ x: number; y: number; t: string }>;
  isActive: boolean;
  lastSeenAt: string;
}

export interface EventNewPayload {
  id: string;
  type: string;
  severity: EventSeverity;
  summary: string;
  cameraName: string;
  timestampStart: string;
  reviewStatus: ReviewStatus;
  snapshotUrl: string | null;
}

export interface EventReviewedPayload {
  eventId: string;
  reviewStatus: ReviewStatus;
  reviewedBy: string;
  reviewedAt: string;
}

export interface ConfigAppliedPayload {
  section: string;
  field: string;
  value: unknown;
  appliedAt: string;
  auditRef: string;
}

export interface ConfigFailedPayload {
  section: string;
  field: string;
  error: string;
  attemptedAt: string;
}
