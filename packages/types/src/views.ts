import type {
  Permission,
  Role,
  CameraStatus,
  EventSeverity,
  ReviewStatus,
  StreamStatus,
  IncidentStatus,
  ConfigFieldType,
} from './enums';

// ── Auth ────────────────────────────────────────────────────────────────

export interface UserSessionView {
  id: string;
  displayName: string;
  email: string;
  role: Role;
  permissions: Permission[];
  lastLoginAt: string | null;
}

export interface LoginResponse {
  user: UserSessionView;
  session: { token: string; expiresAt: string };
}

// ── Camera ──────────────────────────────────────────────────────────────

export interface CameraSummary {
  id: string;
  name: string;
  status: CameraStatus;
  location: string;
  lastFrameAt: string | null;
  fps: number;
  latencyMs: number;
  activePresetName: string | null;
  thumbnailUrl: string | null;
  resolution: string | null;
}

export interface Zone {
  id: string;
  name: string;
  polygon: number[][];
  type: 'detection' | 'exclusion' | 'tripwire';
}

export interface SceneProfileSummary {
  id: string;
  name: string;
  motionSensitivity: number;
  detectorConfidence: number;
  iouThreshold: number;
  trackingBuffer: number;
  classes: string[];
}

export interface CameraDetail {
  id: string;
  name: string;
  status: CameraStatus;
  location: string;
  sourceUrl: string;
  streamUrl: string;
  config: { codec: string; bufferSize: number; reconnectIntervalMs: number };
  zones: Zone[];
  activeProfile: SceneProfileSummary | null;
  lastFrameAt: string | null;
  fps: number;
  latencyMs: number;
  activePresetName: string | null;
  thumbnailUrl: string | null;
  resolution: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LiveSceneState {
  cameraId: string;
  streamStatus: StreamStatus;
  activeTracksCount: number;
  detectionsCount: number;
  currentMode: string;
  lastAlertAt: string | null;
}

// ── Events ──────────────────────────────────────────────────────────────

export interface EventListItem {
  id: string;
  type: string;
  severity: EventSeverity;
  summary: string;
  cameraId: string;
  cameraName: string;
  timestampStart: string;
  reviewStatus: ReviewStatus;
  snapshotUrl: string | null;
  objectClass: string | null;
  confidence: number | null;
}

export interface ReviewHistoryEntry {
  timestamp: string;
  reviewer: string;
  action: string;
  notes: string | null;
}

export interface EventDetail {
  id: string;
  type: string;
  severity: EventSeverity;
  summary: string;
  cameraId: string;
  cameraName: string;
  timestampStart: string;
  timestampEnd: string | null;
  createdAt: string;
  objectClass: string | null;
  confidence: number | null;
  bbox: { x: number; y: number; w: number; h: number } | null;
  reviewStatus: ReviewStatus;
  reviewedBy: string | null;
  reviewedAt: string | null;
  reviewNotes: string | null;
  tracks: Array<{ trackId: string; className: string; positions: Array<{ x: number; y: number; t: string }> }>;
  configSnapshot: Record<string, unknown> | null;
  clipUrl: string | null;
  snapshotUrl: string | null;
  thumbnailUrl: string | null;
  ruleId: string | null;
  ruleName: string | null;
  relatedEventIds: string[];
  reviewHistory: ReviewHistoryEntry[];
}

// ── Presets ─────────────────────────────────────────────────────────────

export interface PresetSummary {
  id: string;
  name: string;
  description: string;
  isBuiltIn: boolean;
  scope: string;
  createdBy: string;
  createdAt: string;
}

export interface PresetDetail extends PresetSummary {
  config: Record<string, unknown>;
  updatedAt: string;
}

// ── Audit ───────────────────────────────────────────────────────────────

export interface AuditChange {
  field: string;
  oldValue: unknown;
  newValue: unknown;
}

export interface AuditLogEntryView {
  id: string;
  userId: string;
  userDisplayName: string;
  action: string;
  resource: string;
  resourceId: string | null;
  changes: AuditChange[] | null;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
}

// ── Incidents ───────────────────────────────────────────────────────────

export interface IncidentSummary {
  id: string;
  title: string;
  status: IncidentStatus;
  severity: EventSeverity;
  eventCount: number;
  createdBy: string;
  assignedTo: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IncidentDetail extends IncidentSummary {
  notes: string;
  events: EventListItem[];
  createdByDisplayName: string;
}

// ── Config ──────────────────────────────────────────────────────────────

export interface RuntimeConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  value: number | boolean | string;
  defaultValue: number | boolean | string;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  description: string;
}

export interface RuntimeConfigSection {
  key: string;
  label: string;
  editable: boolean;
  fields: RuntimeConfigField[];
}

export interface RuntimeConfigView {
  presetId: string | null;
  presetName: string | null;
  sections: RuntimeConfigSection[];
  permissions: { canEdit: boolean; canApplyPreset: boolean; canRollback: boolean };
  version: number;
  updatedAt: string;
  updatedBy: string | null;
}

// ── Health & Metrics ────────────────────────────────────────────────────

export interface HealthOverview {
  status: 'healthy' | 'degraded' | 'critical';
  timestamp: string;
  services: Array<{
    name: string;
    status: 'up' | 'down' | 'degraded';
    latencyMs: number | null;
    lastCheckAt: string;
    uptime?: number;
    version?: string;
  }>;
  cameras: { online: number; offline: number; degraded: number; total: number };
  resources: {
    cpuPercent: number;
    gpuPercent: number | null;
    ramMb: number;
    ramTotalMb: number;
    diskPercent: number;
    gpuTempCelsius?: number | null;
  };
  inference: {
    modelName: string;
    latencyP50Ms: number;
    latencyP95Ms: number;
    throughputFps: number;
    queueDepth: number;
    droppedFrames24h: number;
  };
  recentErrors: Array<{
    code?: string;
    message: string;
    timestamp: string;
    source: string;
    count?: number;
  }>;
}

export interface DashboardKpis {
  activeCameras: number;
  alertsToday: number;
  activeTracksNow: number;
  avgLatencyMs: number;
  droppedFrames15m: number;
  timestamp: string;
}

export interface MetricTimeSeries {
  metric: string;
  unit: string;
  datapoints: Array<{ timestamp: string; value: number }>;
}

// ── Generic ─────────────────────────────────────────────────────────────

export interface PaginatedResponse<T> {
  data: T[];
  pagination: { page: number; limit: number; total: number; totalPages: number };
}

export interface ApiError {
  error: { code: string; message: string; retryable: boolean; context?: Record<string, unknown> };
}
