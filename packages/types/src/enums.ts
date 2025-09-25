export type Role = 'VIEWER' | 'OPERATOR' | 'ANALYST' | 'ADMIN' | 'SUPER_ADMIN';

export type CameraStatus = 'online' | 'offline' | 'buffering' | 'degraded' | 'paused' | 'reconnecting';

export type EventSeverity = 'info' | 'low' | 'medium' | 'high' | 'critical';

export type ReviewStatus = 'unreviewed' | 'confirmed' | 'false_positive' | 'ignored' | 'escalated';

export type ConfigApplyStatus = 'idle' | 'pending' | 'applied' | 'failed' | 'rolled_back';

export type StreamStatus = 'live' | 'buffering' | 'lost' | 'paused' | 'no_source';

export type IncidentStatus = 'open' | 'investigating' | 'resolved' | 'closed';

export type EventType = 'motion_detected' | 'object_detected' | 'rule_triggered' | 'track_started' | 'track_lost' | 'system_alert';

export type ConfigFieldType = 'float' | 'int' | 'boolean' | 'select';

export type CameraProtocol = 'rtsp' | 'mjpeg' | 'hls' | 'rtmp' | 'webcam' | 'file' | 'webrtc' | 'onvif' | 'auto';

export type Permission =
  | 'dashboard:read'
  | 'camera:read' | 'camera:create' | 'camera:update' | 'camera:delete'
  | 'event:read' | 'event:review' | 'event:export'
  | 'incident:read' | 'incident:create' | 'incident:update'
  | 'rule:read' | 'rule:create' | 'rule:update' | 'rule:delete'
  | 'config:read' | 'config:update' | 'config:rollback'
  | 'preset:read' | 'preset:create' | 'preset:apply'
  | 'audit:read'
  | 'health:read'
  | 'user:read' | 'user:create' | 'user:update' | 'user:delete';
