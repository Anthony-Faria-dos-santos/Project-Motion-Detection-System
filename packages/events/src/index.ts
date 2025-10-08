/**
 * @motionops/events — Realtime event contracts and constants.
 *
 * Re-exports event types from @motionops/types and provides
 * event name constants for use with Socket.IO.
 */

export { type ServerEvents, type ClientEvents } from '@motionops/types';

export const SERVER_EVENTS = {
  SYSTEM_HEALTH: 'system:health',
  CAMERA_STATUS: 'camera:status',
  CAMERA_SCENE: 'camera:scene',
  DETECTION_CREATED: 'detection:created',
  TRACK_UPDATED: 'track:updated',
  EVENT_NEW: 'event:new',
  EVENT_REVIEWED: 'event:reviewed',
  CONFIG_APPLIED: 'config:applied',
  CONFIG_FAILED: 'config:failed',
} as const;

export const CLIENT_EVENTS = {
  CAMERA_SUBSCRIBE: 'camera:subscribe',
  CAMERA_UNSUBSCRIBE: 'camera:unsubscribe',
  ADMIN_SUBSCRIBE: 'admin:subscribe',
  HEALTH_SUBSCRIBE: 'health:subscribe',
} as const;
