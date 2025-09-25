import type { Role, CameraStatus, EventSeverity, ReviewStatus } from './enums';

export interface User {
  id: string;
  email: string;
  displayName: string;
  role: Role;
  status: string;
  createdAt: string;
}

export interface Camera {
  id: string;
  name: string;
  sourceUrl: string;
  status: CameraStatus;
  resolution: string | null;
  fps: number | null;
  latencyMs: number | null;
  lastHeartbeat: string | null;
  activeProfileId: string | null;
}

export interface Zone {
  id: string;
  name: string;
  polygon: number[][];
  cameraId: string;
  type: 'detection' | 'exclusion' | 'tripwire';
}

export interface SceneProfile {
  id: string;
  name: string;
  motionSensitivity: number;
  detectorConfidence: number;
  iouThreshold: number;
  trackingBuffer: number;
  classes: string[];
  cameraId: string;
  createdAt: string;
  updatedAt: string;
}

export interface Event {
  id: string;
  type: string;
  severity: EventSeverity;
  summary: string;
  cameraId: string;
  ruleId: string | null;
  reviewStatus: ReviewStatus;
  metadata: Record<string, unknown> | null;
  snapshotUrl: string | null;
  clipUrl: string | null;
  timestampStart: string;
  timestampEnd: string | null;
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  action: string;
  resource: string;
  resourceId: string | null;
  before: unknown;
  after: unknown;
  result: string;
  createdAt: string;
}
