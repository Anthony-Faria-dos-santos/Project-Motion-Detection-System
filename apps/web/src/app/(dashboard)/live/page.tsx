'use client';

/**
 * Live Monitoring — React port of
 * docs/02-ux/frontend-handoff/live-monitoring-mockup.html
 *
 * This page composes the MotionOps signature components from
 * `@/components/ui/motionops` (generic + live/* barrel) and renders a faithful
 * triptyque layout: left camera rail, center video+timeline stack, right panel.
 *
 * Layout boundary
 * ---------------
 * The parent `(dashboard)/layout.tsx` already provides the global AppShell
 * (Sidebar + Header). This page only renders the *content* region and builds
 * its own 3-column grid inside `<main>`. The camera rail rendered here is
 * page-local (it lists cameras, not app sections) and does NOT duplicate the
 * global nav.
 *
 * Data
 * ----
 * Everything is pure mock (`./mock-live-data`) for now. Real hook wiring
 * (useApi / useSocket) is deferred until the backend surfaces a Live
 * endpoint — see TODO below. The mocks are typed so a future switch to real
 * data can be a type-safe drop-in.
 */

import { useEffect, useMemo, useState } from 'react';
import { useLiveCamera } from '@/hooks/use-live-camera';
import { useCameras } from '@/hooks/use-api';
import { getSocket } from '@/lib/socket-client';
import {
  // Generic
  KpiCard,
  SystemPulseCard,
  StatusPill,
  KeyboardHints,
  EventCard,
  // Live-specific
  LiveVideoPanel,
  VideoChromeTop,
  VideoChromeBottom,
  OverlayToggleGroup,
  FrameMetaStrip,
  TrackingBoundingBox,
  TrackTrail,
  ZonePolygon,
  CameraListItem,
  TimelineTrack,
} from '@/components/ui/motionops';
import {
  mockActiveCameraId,
  mockActiveRules,
  mockBoundingBoxes,
  mockCameras,
  mockCurrentTimelinePercent,
  mockEventStream,
  mockKpis,
  mockTimelineEvents,
  mockTimelineTicks,
  mockTrails,
  mockZones,
} from './mock-live-data';

// Realtime feed: `useLiveCamera` subscribes to the `camera:<id>` Socket.IO
// room exposed by the API. As long as a worker-CV process is publishing
// `worker:frame` / `worker:tracks`, the hook returns live data. When the
// feed is silent (no worker, demo account, etc.), it returns null and the
// page falls back to the mock SVG scene + mock bounding boxes so the layout
// never collapses in dev.

const OVERLAY_OPTIONS = [
  { id: 'boxes', label: 'Boxes' },
  { id: 'labels', label: 'Labels' },
  { id: 'zones', label: 'Zones' },
  { id: 'tracks', label: 'Tracks' },
  { id: 'heatmap', label: 'Heatmap' },
];

const FRAME_META = [
  { label: 'Inference', value: 'YOLOv11' },
  { label: 'Conf', value: '0.72' },
  { label: 'IoU', value: '0.45' },
  { label: 'Preset', value: 'Night · Gate' },
];

const KEYBOARD_HINTS = [
  { keys: 'C', label: 'Confirm' },
  { keys: 'F', label: 'False +' },
  { keys: 'E', label: 'Escalate' },
  { keys: 'R', label: 'Replay' },
  { keys: 'Space', label: 'Pause' },
];

const SEVERITY_TO_TONE: Record<string, 'critical' | 'warning' | 'info' | 'success'> = {
  CRITICAL: 'critical',
  HIGH: 'critical',
  MEDIUM: 'warning',
  LOW: 'info',
  INFO: 'info',
};

const CAMERA_STATUS_TO_RAIL_STATUS: Record<string, 'live' | 'alert' | 'offline'> = {
  ONLINE: 'live',
  DEGRADED: 'alert',
  BUFFERING: 'alert',
  RECONNECTING: 'alert',
  PAUSED: 'offline',
  OFFLINE: 'offline',
};

export default function LiveMonitoringPage() {
  const { data: apiCameras } = useCameras({ limit: 50 });
  const railCameras = useMemo(() => {
    if (!apiCameras?.data?.length) return mockCameras;
    return apiCameras.data.map((c) => ({
      id: c.id,
      name: c.name,
      status: CAMERA_STATUS_TO_RAIL_STATUS[c.status as string] ?? 'offline',
      fps: c.fps ?? null,
    }));
  }, [apiCameras]);

  const [activeCameraId, setActiveCameraId] = useState<string>(mockActiveCameraId);
  const [activeOverlays, setActiveOverlays] = useState<Set<string>>(
    () => new Set(['boxes', 'labels', 'zones']),
  );

  useEffect(() => {
    if (railCameras.length && !railCameras.find((c) => c.id === activeCameraId)) {
      setActiveCameraId(railCameras[0]!.id);
    }
  }, [railCameras, activeCameraId]);

  const activeCamera = useMemo(
    () => railCameras.find((c) => c.id === activeCameraId) ?? railCameras[0]!,
    [activeCameraId, railCameras],
  );

  const hasCriticalEvent = useMemo(
    () => mockEventStream.some((e) => e.severity === 'critical'),
    [],
  );

  const showBoxes = activeOverlays.has('boxes');
  const showZones = activeOverlays.has('zones');
  const showTracks = activeOverlays.has('tracks');

  const { frame: liveFrame, tracks: liveTracks, demoFeed } = useLiveCamera(activeCameraId);
  const isImageClip = demoFeed?.clipUrl
    ? /\.(jpg|jpeg|png|webp|avif)(\?.*)?$/i.test(demoFeed.clipUrl)
    : false;
  const isVideoClip = demoFeed?.clipUrl
    ? /\.(mp4|webm|mov)(\?.*)?$/i.test(demoFeed.clipUrl)
    : false;

  const demoTimelineEvents = useMemo(() => {
    if (!demoFeed?.script) return null;
    const loopSec = demoFeed.loopDurationMs / 1000;
    return demoFeed.script.map((s) => ({
      id: `demo-${s.offsetSec}`,
      leftPercent: Math.max(0, Math.min(100, (s.offsetSec / loopSec) * 100)),
      severity: SEVERITY_TO_TONE[s.severity] ?? 'info',
      label: s.summary,
    }));
  }, [demoFeed]);

  const [liveEventStream, setLiveEventStream] = useState<
    Array<{ id: string; severity: 'critical' | 'warning' | 'info' | 'success'; type: string; time: string; meta: string }>
  >([]);

  useEffect(() => {
    if (!activeCameraId) return;
    const socket = getSocket();
    const onEventNew = (payload: {
      id: string;
      severity: string;
      type: string;
      summary: string;
      cameraName?: string;
      timestampStart: string;
      objectClass?: string | null;
    }) => {
      setLiveEventStream((prev) =>
        [
          {
            id: payload.id,
            severity: SEVERITY_TO_TONE[payload.severity.toUpperCase()] ?? 'info',
            type: payload.type,
            time: 'just now',
            meta: [payload.cameraName, payload.objectClass].filter(Boolean).join(' · ') || payload.summary,
          },
          ...prev,
        ].slice(0, 20),
      );
    };
    socket.on('event:new', onEventNew);
    return () => {
      socket.off('event:new', onEventNew);
    };
  }, [activeCameraId]);

  useEffect(() => {
    setLiveEventStream([]);
  }, [activeCameraId]);

  const eventStream = liveEventStream.length ? liveEventStream : mockEventStream;

  // Prefer live worker boxes; fall back to the mock set if the feed is silent.
  const boundingBoxes = liveTracks?.tracks.length
    ? liveTracks.tracks.map((t) => ({
        id: t.id,
        x: t.box.x,
        y: t.box.y,
        width: t.box.w,
        height: t.box.h,
        label: t.className,
        confidence: t.confidence,
        severity: 'info' as const,
        trackId: t.id,
      }))
    : mockBoundingBoxes;

  const handleOverlayToggle = (id: string) => {
    setActiveOverlays((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  return (
    // The parent <main> already applies p-6. We consume the remaining viewport
    // (header=56px, banners may add more; calc(100vh - 8rem) mirrors the
    // legacy page's budget) and stamp a 2-row / 3-column grid:
    //   row 1  → sidebar | main video  | rightpanel
    //   row 2  → sidebar | timeline    | rightpanel
    <div
      className="grid min-h-0 gap-0 overflow-hidden rounded-[var(--mo-radius-lg)] border border-[var(--mo-border-subtle)] bg-[var(--mo-bg-app)]"
      style={{
        height: 'calc(100vh - 8rem)',
        gridTemplateRows: '1fr 180px',
        gridTemplateColumns: '240px 1fr 340px',
        gridTemplateAreas: `
          "sidebar main     rightpanel"
          "sidebar timeline rightpanel"
        `,
      }}
    >
      {/* ═════════════════════ LEFT — Camera rail ═════════════════════ */}
      <aside
        className="flex min-h-0 flex-col gap-[var(--mo-space-5)] overflow-y-auto border-r border-[var(--mo-border-subtle)] bg-[var(--mo-bg-surface)] px-[var(--mo-space-3)] py-[var(--mo-space-4)]"
        style={{ gridArea: 'sidebar' }}
      >
        <div>
          <div className="mb-[var(--mo-space-2)] px-[var(--mo-space-3)] text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--mo-fg-muted)]">
            Cameras · {railCameras.length}
          </div>
          <div className="flex flex-col gap-[var(--mo-space-1)]">
            {railCameras.map((cam) => (
              <CameraListItem
                key={cam.id}
                name={cam.name}
                status={cam.status}
                fps={cam.fps}
                active={cam.id === activeCameraId}
                onClick={() => setActiveCameraId(cam.id)}
              />
            ))}
          </div>
        </div>
      </aside>

      {/* ═════════════════════ CENTER TOP — Main video ═════════════════════ */}
      <main
        className="flex min-h-0 min-w-0 flex-col gap-[var(--mo-space-3)] p-[var(--mo-space-4)]"
        style={{ gridArea: 'main' }}
      >
        {/* Main header */}
        <div className="flex items-center gap-[var(--mo-space-3)]">
          <h2 className="text-[22px] font-semibold -tracking-[0.01em] text-[var(--mo-fg-primary)]">
            {activeCamera.name}
          </h2>
          <StatusPill tone="error" pulse>
            Active Event
          </StatusPill>
          <div className="ml-auto flex items-center gap-[var(--mo-space-2)] font-mono text-[11px] text-[var(--mo-fg-muted)]">
            <span>1920×1080</span>
            <span className="text-[var(--mo-border-strong)]">·</span>
            <span>{activeCamera.fps ?? '—'}fps</span>
            <span className="text-[var(--mo-border-strong)]">·</span>
            <span>latency 142ms</span>
          </div>
        </div>

        {/* Video panel with SVG scene + overlays */}
        <LiveVideoPanel activeEvent={hasCriticalEvent}>
          <VideoChromeTop
            camTitle={activeCamera.name}
            rtspUrl="rtsp://192.0.2.12/stream1"
            showRecording
          />

          {/* Live worker frame (JPEG data URL or presigned URL) — renders on
              top of the mock SVG when a real feed is available. Stays hidden
              in dev / demo / offline, so the scene below stays visible. */}
          {liveFrame && (liveFrame.frameUrl || liveFrame.frame) && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={liveFrame.frameUrl ?? `data:image/jpeg;base64,${liveFrame.frame}`}
              alt={`Live feed of ${activeCamera.name}`}
              className="absolute inset-0 h-full w-full object-cover"
            />
          )}

          {/* Demo feed — static image or looping video behind the SVG overlays.
              The backend DemoSimulator emits camera:demo_feed with a clipUrl
              pointing at a JPG/PNG/MP4 in /public/demo/clips, plus a scripted
              event timeline that drives the bounding boxes + event stream. */}
          {demoFeed?.clipUrl && isImageClip && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={demoFeed.clipUrl}
              alt={`Demo feed for ${activeCamera.name}`}
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: 'contrast(1.08) saturate(0.85) brightness(0.95)' }}
            />
          )}
          {demoFeed?.clipUrl && isVideoClip && (
            <video
              src={demoFeed.clipUrl}
              autoPlay
              loop
              muted
              playsInline
              className="absolute inset-0 h-full w-full object-cover"
              style={{ filter: 'contrast(1.08) saturate(0.85) brightness(0.95)' }}
            />
          )}
          {demoFeed?.clipUrl && (
            <div
              className="pointer-events-none absolute right-3 top-3 z-10 flex items-center gap-2 rounded-[var(--mo-radius-sm)] bg-black/60 px-2 py-1 font-mono text-[11px] tracking-wider text-red-300 backdrop-blur-sm"
            >
              <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-red-500" />
              REC
            </div>
          )}

          {/* Fake video scene — reproduced from the mockup SVG.
             Literal hex colors are intentional here: these are decorative
             scene elements (sky/ground/building/lights) standing in for a
             real video feed, not semantic tokens. */}
          <svg
            className="absolute inset-0 h-full w-full"
            viewBox="0 0 1200 700"
            preserveAspectRatio="xMidYMid slice"
            aria-label="Video feed mockup"
          >
            <defs>
              <linearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0E1C2F" />
                <stop offset="100%" stopColor="#020510" />
              </linearGradient>
              <linearGradient id="ground" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#0B1220" />
                <stop offset="100%" stopColor="#050810" />
              </linearGradient>
              <filter id="cyanGlow">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Sky + ground backdrop */}
            <rect width="1200" height="420" fill="url(#sky)" />
            <rect y="420" width="1200" height="280" fill="url(#ground)" />

            {/* Horizon line */}
            <line
              x1="0"
              y1="420"
              x2="1200"
              y2="420"
              stroke="#6EE7FF"
              strokeOpacity="0.15"
              strokeWidth="1"
            />

            {/* Warehouse silhouette */}
            <path
              d="M 120 420 L 120 180 L 480 180 L 480 140 L 720 140 L 720 180 L 1080 180 L 1080 420 Z"
              fill="#0A131F"
              stroke="#1A2D45"
              strokeWidth="1.5"
            />
            {/* Gate opening */}
            <rect x="360" y="280" width="120" height="140" fill="#020510" />
            <line
              x1="420"
              y1="280"
              x2="420"
              y2="420"
              stroke="#6EE7FF"
              strokeOpacity="0.25"
              strokeWidth="1"
            />

            {/* Amber lights above the warehouse */}
            <circle
              cx="300"
              cy="200"
              r="3"
              fill="#F9B13A"
              filter="url(#cyanGlow)"
            />
            <circle
              cx="900"
              cy="200"
              r="3"
              fill="#F9B13A"
              filter="url(#cyanGlow)"
            />

            {/* Perspective ground zone lines */}
            <path
              d="M 0 540 L 1200 540 M 200 700 L 480 420 M 1000 700 L 720 420"
              stroke="#6EE7FF"
              strokeOpacity="0.1"
              strokeWidth="1"
              fill="none"
            />

            {/* Zones (optional layer) */}
            {showZones &&
              mockZones.map((zone) => (
                <ZonePolygon
                  key={zone.id}
                  points={zone.points}
                  label={zone.label}
                  severity={zone.severity}
                  labelPosition={{ x: 430, y: 500 }}
                />
              ))}

            {/* Motion trails (optional layer) */}
            {showTracks &&
              mockTrails.map((trail) => (
                <TrackTrail
                  key={trail.id}
                  points={trail.points}
                  severity={trail.severity}
                  opacity={trail.severity === 'critical' ? 0.5 : 0.4}
                />
              ))}

            {/* Fallback: show trails in default layout even when Tracks toggle
               is off, because the mockup ships them on by default. We render
               them dimmer when Tracks is off so they hint at the layer without
               overwhelming the scene. */}
            {!showTracks &&
              mockTrails.map((trail) => (
                <TrackTrail
                  key={`${trail.id}-ghost`}
                  points={trail.points}
                  severity={trail.severity}
                  opacity={0.18}
                />
              ))}

            {/* Person silhouette (scene dressing — stays below the bbox) */}
            <g transform="translate(420, 380)">
              <circle cx="22" cy="18" r="10" fill="#1a2436" />
              <path d="M 10 30 L 10 80 L 34 80 L 34 30 Z" fill="#0F1826" />
              <path d="M 10 60 L 34 60" stroke="#050810" strokeWidth="1" />
            </g>

            {/* Vehicle silhouette */}
            <g transform="translate(860, 450)">
              <rect
                x="10"
                y="30"
                width="120"
                height="40"
                rx="4"
                fill="#14202E"
              />
              <rect
                x="25"
                y="15"
                width="90"
                height="20"
                rx="3"
                fill="#0E1825"
              />
              <circle cx="30" cy="72" r="8" fill="#05080C" />
              <circle cx="110" cy="72" r="8" fill="#05080C" />
            </g>

            {/* Tracking bounding boxes (optional layer) */}
            {showBoxes &&
              boundingBoxes.map((bbox) => (
                <TrackingBoundingBox
                  key={bbox.id}
                  x={bbox.x}
                  y={bbox.y}
                  width={bbox.width}
                  height={bbox.height}
                  label={bbox.label}
                  confidence={bbox.confidence}
                  severity={bbox.severity}
                  trackId={bbox.trackId}
                />
              ))}

            {/* Scanline */}
            <rect
              width="1200"
              height="2"
              y="340"
              fill="rgba(110,231,255,0.08)"
            />
          </svg>

          {/* Keyboard shortcuts overlay */}
          <KeyboardHints hints={KEYBOARD_HINTS} />

          {/* Bottom chrome: overlay toggles + inference metadata */}
          <VideoChromeBottom>
            <OverlayToggleGroup
              options={OVERLAY_OPTIONS}
              active={activeOverlays}
              onToggle={handleOverlayToggle}
            />
            <FrameMetaStrip items={FRAME_META} />
          </VideoChromeBottom>
        </LiveVideoPanel>
      </main>

      {/* ═════════════════════ CENTER BOTTOM — Timeline ═════════════════════ */}
      <div className="min-w-0" style={{ gridArea: 'timeline' }}>
        <TimelineTrack
          className="h-full"
          rangeLabel={demoFeed ? `Loop · ${Math.round(demoFeed.loopDurationMs / 1000)}s · ${activeCamera.name}` : '14:00 → 15:00 · Cam 02'}
          ticks={mockTimelineTicks}
          events={demoTimelineEvents ?? mockTimelineEvents}
          currentPercent={mockCurrentTimelinePercent}
        />
      </div>

      {/* ═════════════════════ RIGHT — System pulse + KPIs + events ═════════════════════ */}
      <aside
        className="flex min-h-0 flex-col gap-[var(--mo-space-4)] overflow-y-auto border-l border-[var(--mo-border-subtle)] bg-[var(--mo-bg-surface)] p-[var(--mo-space-4)]"
        style={{ gridArea: 'rightpanel' }}
      >
        {/* System Pulse */}
        <section className="flex flex-col gap-[var(--mo-space-2)]">
          <div className="flex items-center gap-[var(--mo-space-2)] text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--mo-fg-muted)]">
            System Pulse
          </div>
          <SystemPulseCard
            tone="healthy"
            label="All systems healthy"
            meta="6/6 cams · 142ms · 0 drops"
          />
        </section>

        {/* Today's KPIs */}
        <section className="flex flex-col gap-[var(--mo-space-2)]">
          <div className="flex items-center gap-[var(--mo-space-2)] text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--mo-fg-muted)]">
            Today's KPIs
          </div>
          <div className="grid grid-cols-2 gap-[var(--mo-space-2)]">
            {mockKpis.map((kpi) => (
              <KpiCard
                key={kpi.label}
                compact
                label={kpi.label}
                value={kpi.value}
                trend={kpi.trend}
                trendDirection={kpi.trendDirection}
                tone={kpi.tone}
              />
            ))}
          </div>
        </section>

        {/* Event Stream */}
        <section className="flex flex-col gap-[var(--mo-space-2)]">
          <div className="flex items-center gap-[var(--mo-space-2)] text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--mo-fg-muted)]">
            Event Stream
            <span className="ml-auto rounded-[var(--mo-radius-full)] bg-[var(--mo-bg-input)] px-2 py-[2px] font-mono text-[10px]">
              {eventStream.length} new
            </span>
          </div>
          <div className="flex flex-col gap-[var(--mo-space-2)]">
            {eventStream.map((evt) => (
              <EventCard
                key={evt.id}
                severity={evt.severity}
                type={evt.type}
                time={evt.time}
                meta={evt.meta}
                onConfirm={() => {
                  /* no-op until the events mutation endpoint lands */
                }}
                onReject={() => {
                  /* no-op */
                }}
                onEscalate={() => {
                  /* no-op */
                }}
              />
            ))}
          </div>
        </section>

        {/* Active Rules */}
        <section className="flex flex-col gap-[var(--mo-space-2)]">
          <div className="flex items-center gap-[var(--mo-space-2)] text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--mo-fg-muted)]">
            Active Rules · {mockActiveRules.length}
          </div>
          <div className="flex flex-wrap gap-[6px] text-[11px]">
            {mockActiveRules.map((rule) => (
              <span key={rule} className="mo-pill mo-pill-primary">
                {rule}
              </span>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
