/**
 * MotionOps Live Monitoring signature components.
 * These are the video-specific primitives that compose the Live Monitoring
 * screen described in docs/02-ux/frontend-handoff/live-monitoring-mockup.html.
 *
 * They consume the generic components from ../*, the canonical tokens from
 * globals.css, and target the React port of Sprint FE-2 of the master plan.
 *
 * Usage pattern:
 *   <LiveVideoPanel activeEvent={hasActiveEvent}>
 *     <VideoChromeTop camTitle="..." rtspUrl="..." showRecording />
 *     <svg>
 *       <defs><filter id="cyanGlow">...</filter></defs>
 *       <ZonePolygon points={zone} label="..." />
 *       <TrackTrail points={trail} severity="info" />
 *       <TrackingBoundingBox x={...} y={...} ... severity="critical" />
 *     </svg>
 *     <VideoChromeBottom>
 *       <OverlayToggleGroup options={...} active={...} onToggle={...} />
 *       <FrameMetaStrip items={...} />
 *     </VideoChromeBottom>
 *   </LiveVideoPanel>
 */

export { LiveVideoPanel } from './LiveVideoPanel';
export { VideoChromeTop } from './VideoChromeTop';
export { VideoChromeBottom } from './VideoChromeBottom';
export { OverlayToggleGroup } from './OverlayToggleGroup';
export { FrameMetaStrip } from './FrameMetaStrip';

export { TrackingBoundingBox } from './TrackingBoundingBox';
export { TrackTrail } from './TrackTrail';
export { ZonePolygon } from './ZonePolygon';

export { CameraListItem } from './CameraListItem';
export { TimelineTrack } from './TimelineTrack';
export { TimelineRuler } from './TimelineRuler';
export { TimelinePlayhead } from './TimelinePlayhead';
