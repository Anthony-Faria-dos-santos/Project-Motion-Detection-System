'use client';

import { useState } from 'react';
import {
  Camera,
  Video,
  MonitorPlay,
  Gauge,
  FrameIcon,
  Activity,
  Eye,
  Tag,
  Fingerprint,
  Route,
  Hexagon,
  Layers,
  Crosshair,
  Move,
  SplitSquareVertical,
  SlidersHorizontal,
  Zap,
  Settings2,
  Save,
  AlertTriangle,
} from 'lucide-react';
import {
  StatusBadge,
  SeverityBadge,
  EmptyState,
  SystemBanner,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  mockCameras,
  mockEvents,
  mockLiveScene,
} from '@/lib/mock-data';
import type { CameraSummary, EventSeverity } from '@motionops/types';

/* ─── Helpers ───────────────────────────────────────────────────────── */

function formatRelativeTime(isoString: string): string {
  const now = Date.now();
  const then = new Date(isoString).getTime();
  const diffMs = now - then;

  if (diffMs < 0) return 'just now';

  const seconds = Math.floor(diffMs / 1000);
  if (seconds < 60) return `${seconds}s ago`;

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;

  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

const streamStatusMap: Record<string, 'online' | 'offline' | 'degraded' | 'buffering' | 'paused'> = {
  live: 'online',
  buffering: 'buffering',
  lost: 'offline',
  paused: 'paused',
  no_source: 'offline',
};

const severityBorderColors: Record<EventSeverity, string> = {
  info: 'border-l-teal-500',
  low: 'border-l-blue-500',
  medium: 'border-l-amber-500',
  high: 'border-l-orange-500',
  critical: 'border-l-red-500',
};

type OverlayKey = 'boxes' | 'labels' | 'ids' | 'trails' | 'zones';
type ViewMode = 'raw' | 'detection' | 'tracking' | 'motion' | 'split';

const overlayOptions: { key: OverlayKey; label: string; icon: React.ElementType }[] = [
  { key: 'boxes', label: 'Boxes', icon: Crosshair },
  { key: 'labels', label: 'Labels', icon: Tag },
  { key: 'ids', label: 'IDs', icon: Fingerprint },
  { key: 'trails', label: 'Trails', icon: Route },
  { key: 'zones', label: 'Zones', icon: Hexagon },
];

const viewModes: { key: ViewMode; label: string; icon: React.ElementType }[] = [
  { key: 'raw', label: 'Raw', icon: Video },
  { key: 'detection', label: 'Detection', icon: Eye },
  { key: 'tracking', label: 'Tracking', icon: Move },
  { key: 'motion', label: 'Motion Mask', icon: Layers },
  { key: 'split', label: 'Split', icon: SplitSquareVertical },
];

const presets = [
  { id: 'preset-1', name: 'Production Standard' },
  { id: 'preset-2', name: 'High Sensitivity' },
  { id: 'preset-3', name: 'Low Power' },
];

/* ─── Sub-Components ────────────────────────────────────────────────── */

function CameraRailItem({
  camera,
  isSelected,
  onSelect,
}: {
  camera: CameraSummary;
  isSelected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      onClick={onSelect}
      className={cn(
        'w-full rounded-md border bg-[hsl(var(--muted))]/20 p-2.5 text-left transition-all hover:bg-[hsl(var(--muted))]/40',
        isSelected
          ? 'border-[hsl(var(--primary))] bg-[hsl(var(--primary))]/5 ring-1 ring-[hsl(var(--primary))]/30'
          : 'border-[hsl(var(--border))]',
      )}
    >
      {/* Thumbnail placeholder */}
      <div
        className={cn(
          'mb-2 flex h-16 items-center justify-center rounded bg-[hsl(var(--muted))]/40 text-[hsl(var(--muted-foreground))]',
          camera.status === 'offline' && 'opacity-40',
        )}
      >
        <Camera className="h-5 w-5" />
      </div>
      <div className="flex items-start justify-between gap-1">
        <span className="text-[11px] font-semibold text-[hsl(var(--foreground))] leading-tight">
          {camera.name}
        </span>
        <StatusBadge status={camera.status} />
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
        <span className="tabular-nums">{camera.fps} fps</span>
        <span className="tabular-nums">{camera.latencyMs}ms</span>
      </div>
    </button>
  );
}

function ToggleSwitch({
  label,
  enabled,
  onChange,
  disabled,
}: {
  label: string;
  enabled: boolean;
  onChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-[hsl(var(--foreground))]">{label}</span>
      <button
        disabled={disabled}
        onClick={() => onChange(!enabled)}
        className={cn(
          'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors',
          enabled ? 'bg-[hsl(var(--primary))]' : 'bg-[hsl(var(--muted))]',
          disabled && 'cursor-not-allowed opacity-40',
        )}
      >
        <span
          className={cn(
            'inline-block h-3.5 w-3.5 rounded-full bg-white transition-transform',
            enabled ? 'translate-x-[18px]' : 'translate-x-[3px]',
          )}
        />
      </button>
    </div>
  );
}

function TuningSlider({
  label,
  value,
  min,
  max,
  step,
  onChange,
  disabled,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  disabled?: boolean;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">{label}</span>
        <span className="rounded bg-[hsl(var(--muted))]/60 px-1.5 py-0.5 text-[11px] font-semibold tabular-nums text-[hsl(var(--foreground))]">
          {step < 1 ? value.toFixed(2) : value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className={cn(
          'h-1.5 w-full cursor-pointer appearance-none rounded-full bg-[hsl(var(--muted))]',
          '[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[hsl(var(--primary))] [&::-webkit-slider-thumb]:transition-transform [&::-webkit-slider-thumb]:hover:scale-110',
          '[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[hsl(var(--primary))]',
          disabled && 'cursor-not-allowed opacity-40',
        )}
      />
      <div className="flex items-center justify-between text-[9px] text-[hsl(var(--muted-foreground))]">
        <span>{step < 1 ? min.toFixed(1) : min}</span>
        <span>{step < 1 ? max.toFixed(1) : max}</span>
      </div>
    </div>
  );
}

/* ─── Page Component ────────────────────────────────────────────────── */

export default function LiveMonitoringPage() {
  // Selection state
  const [selectedCameraId, setSelectedCameraId] = useState<string | null>(null);
  const selectedCamera = mockCameras.find((c) => c.id === selectedCameraId) ?? null;
  const isOffline = selectedCamera?.status === 'offline';
  const controlsDisabled = !selectedCamera || isOffline;

  // Overlay toggles
  const [overlays, setOverlays] = useState<Record<OverlayKey, boolean>>({
    boxes: true,
    labels: true,
    ids: false,
    trails: false,
    zones: true,
  });

  // View mode
  const [viewMode, setViewMode] = useState<ViewMode>('detection');

  // Pipeline toggles
  const [pipelineMotion, setPipelineMotion] = useState(true);
  const [pipelineDetection, setPipelineDetection] = useState(true);
  const [pipelineTracking, setPipelineTracking] = useState(true);

  // Tuning sliders
  const [confidence, setConfidence] = useState(0.50);
  const [iouThreshold, setIouThreshold] = useState(0.45);
  const [motionSensitivity, setMotionSensitivity] = useState(0.50);
  const [minObjectSize, setMinObjectSize] = useState(500);

  // Preset
  const [selectedPreset, setSelectedPreset] = useState('preset-1');

  // Scene state (mock -- uses selected camera or default)
  const scene = selectedCamera
    ? { ...mockLiveScene, cameraId: selectedCamera.id }
    : null;

  return (
    <div className="flex h-[calc(100vh-theme(spacing.16))] flex-col gap-0">
      {/* ── Offline Banner ──────────────────────────────────────────── */}
      {isOffline && (
        <SystemBanner
          type="critical"
          message={`Camera ${selectedCamera.name} is offline. Controls are disabled until the stream resumes.`}
          dismissible={false}
        />
      )}

      {/* ── Main Area (Camera Rail + Video + Controls) ──────────────── */}
      <div className="flex min-h-0 flex-1 gap-0">
        {/* ── Camera Rail (Left) ────────────────────────────────────── */}
        <aside className="flex w-48 shrink-0 flex-col border-r border-[hsl(var(--border))] bg-[hsl(var(--card))]/50">
          <div className="border-b border-[hsl(var(--border))] px-3 py-2.5">
            <h2 className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Cameras
            </h2>
          </div>
          <div className="flex-1 space-y-2 overflow-y-auto p-2">
            {mockCameras.map((cam) => (
              <CameraRailItem
                key={cam.id}
                camera={cam}
                isSelected={selectedCameraId === cam.id}
                onSelect={() => setSelectedCameraId(cam.id)}
              />
            ))}
          </div>
        </aside>

        {/* ── Video Area (Center) ───────────────────────────────────── */}
        <div className="flex min-w-0 flex-1 flex-col">
          {!selectedCamera ? (
            <div className="flex flex-1 items-center justify-center">
              <EmptyState
                icon={MonitorPlay}
                title="Select a camera to start monitoring"
                description="Choose a camera from the rail on the left to view its live feed, configure overlays, and tune the detection pipeline."
                className="max-w-sm"
              />
            </div>
          ) : (
            <>
              {/* Top bar */}
              <div className="flex items-center justify-between border-b border-[hsl(var(--border))] bg-[hsl(var(--card))]/30 px-4 py-2">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Camera className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {selectedCamera.name}
                    </span>
                  </div>
                  <StatusBadge
                    status={
                      scene
                        ? streamStatusMap[scene.streamStatus] || 'offline'
                        : 'offline'
                    }
                    label={scene?.streamStatus ?? 'unknown'}
                  />
                </div>
                <div className="flex items-center gap-4 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <div className="flex items-center gap-1">
                    <FrameIcon className="h-2.5 w-2.5" />
                    <span className="font-medium text-[hsl(var(--foreground))] tabular-nums">
                      {selectedCamera.fps}
                    </span>
                    <span>fps</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Gauge className="h-2.5 w-2.5" />
                    <span
                      className={cn(
                        'font-medium tabular-nums',
                        selectedCamera.latencyMs > 80
                          ? 'text-amber-400'
                          : 'text-emerald-400',
                      )}
                    >
                      {selectedCamera.latencyMs}
                    </span>
                    <span>ms</span>
                  </div>
                  {selectedCamera.resolution && (
                    <span>{selectedCamera.resolution}</span>
                  )}
                  <span className="rounded bg-[hsl(var(--muted))]/60 px-1.5 py-0.5 text-[10px] font-medium uppercase text-[hsl(var(--primary))]">
                    {viewMode}
                  </span>
                </div>
              </div>

              {/* Video feed placeholder */}
              <div className="relative flex flex-1 items-center justify-center bg-zinc-950">
                {/* Grid pattern background */}
                <div
                  className="absolute inset-0 opacity-[0.04]"
                  style={{
                    backgroundImage:
                      'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)',
                    backgroundSize: '40px 40px',
                  }}
                />

                {isOffline ? (
                  <div className="z-10 flex flex-col items-center gap-3 text-center">
                    <AlertTriangle className="h-10 w-10 text-red-500/60" />
                    <p className="text-sm font-medium text-red-400">
                      Camera Offline
                    </p>
                    <p className="text-xs text-zinc-500">
                      No signal from {selectedCamera.name}
                    </p>
                  </div>
                ) : (
                  <div className="z-10 flex flex-col items-center gap-2 text-center">
                    <MonitorPlay className="h-10 w-10 text-zinc-600" />
                    <p className="text-sm font-medium text-zinc-400">
                      Video Feed — {selectedCamera.id}
                    </p>
                    <p className="text-[10px] text-zinc-600">
                      {selectedCamera.resolution} @ {selectedCamera.fps} fps
                    </p>
                  </div>
                )}

                {/* Overlay indicators (shown when feed is live) */}
                {!isOffline && (
                  <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                    {Object.entries(overlays)
                      .filter(([, v]) => v)
                      .map(([key]) => (
                        <span
                          key={key}
                          className="rounded bg-zinc-800/80 px-1.5 py-0.5 text-[9px] font-medium uppercase text-zinc-400"
                        >
                          {key}
                        </span>
                      ))}
                  </div>
                )}

                {/* Live indicator */}
                {!isOffline && scene?.streamStatus === 'live' && (
                  <div className="absolute right-3 top-3 flex items-center gap-1.5">
                    <div className="h-2 w-2 animate-pulse rounded-full bg-red-500" />
                    <span className="text-[10px] font-semibold uppercase text-red-400">
                      Live
                    </span>
                  </div>
                )}
              </div>

              {/* Overlay toggles + View mode bar */}
              <div className="flex items-center justify-between border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]/30 px-4 py-2">
                {/* Overlay toggles */}
                <div className="flex items-center gap-1.5">
                  <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Overlays
                  </span>
                  {overlayOptions.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      disabled={controlsDisabled}
                      onClick={() =>
                        setOverlays((prev) => ({ ...prev, [key]: !prev[key] }))
                      }
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors',
                        overlays[key]
                          ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]'
                          : 'bg-[hsl(var(--muted))]/40 text-[hsl(var(--muted-foreground))]',
                        controlsDisabled && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {label}
                    </button>
                  ))}
                </div>

                {/* View mode buttons */}
                <div className="flex items-center gap-1">
                  <span className="mr-1 text-[10px] font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    View
                  </span>
                  {viewModes.map(({ key, label, icon: Icon }) => (
                    <button
                      key={key}
                      disabled={controlsDisabled}
                      onClick={() => setViewMode(key)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium transition-colors',
                        viewMode === key
                          ? 'bg-[hsl(var(--primary))]/15 text-[hsl(var(--primary))]'
                          : 'bg-[hsl(var(--muted))]/40 text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]/60',
                        controlsDisabled && 'cursor-not-allowed opacity-40',
                      )}
                    >
                      <Icon className="h-2.5 w-2.5" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>

        {/* ── Controls Panel (Right) ────────────────────────────────── */}
        <aside className="flex w-72 shrink-0 flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]/50">
          <div className="flex-1 overflow-y-auto">
            {/* Scene Summary */}
            <div className="border-b border-[hsl(var(--border))] p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <Activity className="h-3 w-3" />
                Scene Summary
              </h3>
              {scene && selectedCamera ? (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Active Tracks</span>
                    <span className="text-sm font-semibold tabular-nums text-teal-400">
                      {scene.activeTracksCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Detections</span>
                    <span className="text-sm font-semibold tabular-nums text-[hsl(var(--foreground))]">
                      {scene.detectionsCount}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Stream</span>
                    <StatusBadge
                      status={streamStatusMap[scene.streamStatus] || 'offline'}
                      label={scene.streamStatus}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Last Alert</span>
                    <span className="text-[11px] font-medium text-[hsl(var(--foreground))]">
                      {scene.lastAlertAt
                        ? formatRelativeTime(scene.lastAlertAt)
                        : 'None'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-[hsl(var(--muted-foreground))]">Mode</span>
                    <span className="rounded bg-[hsl(var(--muted))]/60 px-1.5 py-0.5 text-[10px] font-medium uppercase text-[hsl(var(--primary))]">
                      {scene.currentMode}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                  No camera selected
                </p>
              )}
            </div>

            {/* Pipeline Controls */}
            <div className="border-b border-[hsl(var(--border))] p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <Zap className="h-3 w-3" />
                Pipeline Controls
              </h3>
              <div className="space-y-3">
                <ToggleSwitch
                  label="Motion Detection"
                  enabled={pipelineMotion}
                  onChange={setPipelineMotion}
                  disabled={controlsDisabled}
                />
                <ToggleSwitch
                  label="Object Detection"
                  enabled={pipelineDetection}
                  onChange={setPipelineDetection}
                  disabled={controlsDisabled}
                />
                <ToggleSwitch
                  label="Tracking"
                  enabled={pipelineTracking}
                  onChange={setPipelineTracking}
                  disabled={controlsDisabled}
                />
              </div>
            </div>

            {/* Tuning Sliders */}
            <div className="border-b border-[hsl(var(--border))] p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <SlidersHorizontal className="h-3 w-3" />
                Tuning
              </h3>
              <div className="space-y-4">
                <TuningSlider
                  label="Confidence"
                  value={confidence}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  onChange={setConfidence}
                  disabled={controlsDisabled}
                />
                <TuningSlider
                  label="IoU Threshold"
                  value={iouThreshold}
                  min={0.1}
                  max={1.0}
                  step={0.05}
                  onChange={setIouThreshold}
                  disabled={controlsDisabled}
                />
                <TuningSlider
                  label="Motion Sensitivity"
                  value={motionSensitivity}
                  min={0.0}
                  max={1.0}
                  step={0.05}
                  onChange={setMotionSensitivity}
                  disabled={controlsDisabled}
                />
                <TuningSlider
                  label="Min Object Size"
                  value={minObjectSize}
                  min={100}
                  max={5000}
                  step={100}
                  onChange={setMinObjectSize}
                  disabled={controlsDisabled}
                />
              </div>
            </div>

            {/* Presets */}
            <div className="p-4">
              <h3 className="mb-3 flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                <Settings2 className="h-3 w-3" />
                Presets
              </h3>
              <div className="flex items-center gap-2">
                <select
                  value={selectedPreset}
                  onChange={(e) => setSelectedPreset(e.target.value)}
                  disabled={controlsDisabled}
                  className={cn(
                    'flex-1 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-2.5 py-1.5 text-xs text-[hsl(var(--foreground))] outline-none transition-colors focus:border-[hsl(var(--primary))]',
                    controlsDisabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  {presets.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <button
                  disabled={controlsDisabled}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--primary))]/90',
                    controlsDisabled && 'cursor-not-allowed opacity-40',
                  )}
                >
                  <Save className="h-3 w-3" />
                  Save
                </button>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* ── Timeline (Bottom) ───────────────────────────────────────── */}
      <div className="shrink-0 border-t border-[hsl(var(--border))] bg-[hsl(var(--card))]/50">
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))]/50 px-4 py-1.5">
          <h3 className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Event Timeline
          </h3>
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {mockEvents.length} events
          </span>
        </div>
        <div className="flex h-28 items-start gap-2.5 overflow-x-auto px-4 py-2.5">
          {mockEvents.map((evt) => (
            <div
              key={evt.id}
              className={cn(
                'flex h-full w-56 shrink-0 flex-col rounded-md border border-[hsl(var(--border))] border-l-[3px] bg-[hsl(var(--muted))]/20 p-2.5 transition-colors hover:bg-[hsl(var(--muted))]/40',
                severityBorderColors[evt.severity],
              )}
            >
              <div className="mb-1.5 flex items-center justify-between">
                <SeverityBadge severity={evt.severity} />
                <span className="text-[9px] text-[hsl(var(--muted-foreground))]">
                  {formatRelativeTime(evt.timestampStart)}
                </span>
              </div>
              <p className="flex-1 text-[11px] font-medium leading-tight text-[hsl(var(--foreground))]">
                {evt.summary}
              </p>
              <div className="mt-1.5 flex items-center gap-1 text-[9px] text-[hsl(var(--muted-foreground))]">
                <Camera className="h-2.5 w-2.5" />
                <span>{evt.cameraName}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
