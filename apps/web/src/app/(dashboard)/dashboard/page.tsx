'use client';

import {
  Camera,
  Activity,
  Gauge,
  FrameIcon,
  Video,
  MapPin,
  Zap,
  Clock,
  ShieldAlert,
  Settings,
  FileSearch,
  MonitorPlay,
  Cpu,
  HardDrive,
  Server,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  XCircle,
  AlertCircle,
} from 'lucide-react';
import {
  KpiCard,
  StatusBadge,
  SeverityBadge,
  Card,
} from '@/components/ui';
import { cn } from '@/lib/utils';
import {
  mockKpis,
  mockCameras,
  mockEvents,
  mockHealth,
} from '@/lib/mock-data';
import { useDashboardKpis, useCameras, useEvents, useHealth } from '@/hooks/use-api';
import type { ReviewStatus } from '@motionops/types';

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

const reviewStatusConfig: Record<ReviewStatus, { label: string; className: string }> = {
  unreviewed: { label: 'Unreviewed', className: 'bg-zinc-500/15 text-zinc-400' },
  confirmed: { label: 'Confirmed', className: 'bg-emerald-500/15 text-emerald-400' },
  false_positive: { label: 'False +', className: 'bg-amber-500/15 text-amber-400' },
  ignored: { label: 'Ignored', className: 'bg-zinc-500/15 text-zinc-500' },
  escalated: { label: 'Escalated', className: 'bg-red-500/15 text-red-400' },
};

function ReviewBadge({ status }: { status: ReviewStatus }) {
  const config = reviewStatusConfig[status];
  return (
    <span
      className={cn(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide',
        config.className,
      )}
    >
      {config.label}
    </span>
  );
}

function ResourceBar({
  label,
  value,
  max,
  unit,
  icon: Icon,
}: {
  label: string;
  value: number;
  max?: number;
  unit: string;
  icon: React.ElementType;
}) {
  const percent = max ? Math.round((value / max) * 100) : value;
  const barColor =
    percent >= 90
      ? 'bg-red-500'
      : percent >= 70
        ? 'bg-amber-500'
        : 'bg-emerald-500';
  const textColor =
    percent >= 90
      ? 'text-red-400'
      : percent >= 70
        ? 'text-amber-400'
        : 'text-emerald-400';

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Icon className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
          <span className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
            {label}
          </span>
        </div>
        <span className={cn('text-[11px] font-semibold tabular-nums', textColor)}>
          {max ? `${value} / ${max} ${unit}` : `${percent}${unit}`}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-[hsl(var(--muted))]">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* ─── Attention / Urgency Block ─────────────────────────────────────── */

function buildAttentionItems(
  camerasData: typeof mockCameras,
  healthData: typeof mockHealth,
  eventsData: typeof mockEvents,
) {
  const items: Array<{
    id: string;
    severity: 'critical' | 'warning';
    message: string;
    detail: string;
  }> = [];

  // Offline cameras
  const offlineCams = camerasData.filter((c) => c.status === 'offline');
  for (const cam of offlineCams) {
    items.push({
      id: `cam-offline-${cam.id}`,
      severity: 'critical',
      message: `Camera ${cam.name} is offline`,
      detail: cam.location,
    });
  }

  // Degraded cameras
  const degradedCams = camerasData.filter((c) => c.status === 'degraded');
  for (const cam of degradedCams) {
    items.push({
      id: `cam-degraded-${cam.id}`,
      severity: 'warning',
      message: `Camera ${cam.name} degraded (${cam.latencyMs}ms latency)`,
      detail: cam.location,
    });
  }

  // Degraded / down services
  for (const svc of healthData.services) {
    if (svc.status === 'down') {
      items.push({
        id: `svc-down-${svc.name}`,
        severity: 'critical',
        message: `${svc.name} service is DOWN`,
        detail: `Last check: ${formatRelativeTime(svc.lastCheckAt)}`,
      });
    } else if (svc.status === 'degraded') {
      items.push({
        id: `svc-degraded-${svc.name}`,
        severity: 'warning',
        message: `${svc.name} service degraded (${svc.latencyMs}ms)`,
        detail: `Last check: ${formatRelativeTime(svc.lastCheckAt)}`,
      });
    }
  }

  // Critical / high unreviewed events
  const urgentEvents = eventsData.filter(
    (e) =>
      (e.severity === 'critical' || e.severity === 'high') &&
      e.reviewStatus === 'unreviewed',
  );
  for (const evt of urgentEvents) {
    items.push({
      id: `evt-${evt.id}`,
      severity: evt.severity === 'critical' ? 'critical' : 'warning',
      message: evt.summary,
      detail: `${evt.cameraName} - ${formatRelativeTime(evt.timestampStart)}`,
    });
  }

  return items;
}

function AttentionBlock({
  cameras: camerasData,
  health: healthData,
  events: eventsData,
}: {
  cameras: typeof mockCameras;
  health: typeof mockHealth;
  events: typeof mockEvents;
}) {
  const items = buildAttentionItems(camerasData, healthData, eventsData);
  if (items.length === 0) return null;

  const hasCritical = items.some((i) => i.severity === 'critical');

  return (
    <div
      className={cn(
        'rounded-lg border-l-4 p-4',
        hasCritical
          ? 'border-l-red-500 border-y border-r border-red-500/20 bg-red-500/5'
          : 'border-l-amber-500 border-y border-r border-amber-500/20 bg-amber-500/5',
      )}
    >
      <div className="mb-3 flex items-center gap-2">
        <ShieldAlert
          className={cn(
            'h-4 w-4',
            hasCritical ? 'text-red-400' : 'text-amber-400',
          )}
        />
        <h3
          className={cn(
            'text-xs font-semibold uppercase tracking-wider',
            hasCritical ? 'text-red-400' : 'text-amber-400',
          )}
        >
          Requires Attention ({items.length})
        </h3>
      </div>
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.id} className="flex items-start gap-2.5">
            {item.severity === 'critical' ? (
              <XCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-red-400" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-400" />
            )}
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                {item.message}
              </p>
              <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                {item.detail}
              </p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ─── Shortcuts ─────────────────────────────────────────────────────── */

const shortcuts = [
  {
    label: 'Live Monitoring',
    href: '/live',
    icon: MonitorPlay,
    description: 'Real-time camera feeds',
  },
  {
    label: 'All Events',
    href: '/events',
    icon: FileSearch,
    description: 'Search & filter events',
  },
  {
    label: 'System Health',
    href: '/health',
    icon: Activity,
    description: 'Services & resources',
  },
  {
    label: 'Admin Panel',
    href: '/admin',
    icon: Settings,
    description: 'Configuration & users',
  },
];

/* ─── Page Component ────────────────────────────────────────────────── */

export default function DashboardPage() {
  const { data: apiKpis } = useDashboardKpis();
  const { data: apiCameras } = useCameras();
  const { data: apiEvents } = useEvents({ limit: 5 });
  const { data: apiHealth } = useHealth();

  const kpis = apiKpis || mockKpis;
  const cameras = apiCameras?.data || mockCameras;
  const events = apiEvents?.data || mockEvents;
  const health = apiHealth || mockHealth;

  return (
    <div className="space-y-6">
      {/* ── Page Header ────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">Dashboard</h1>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            System overview — last updated{' '}
            <span className="font-medium text-[hsl(var(--foreground))]">
              {formatRelativeTime(kpis.timestamp)}
            </span>
          </p>
        </div>
        <StatusBadge
          status={
            health.status === 'healthy'
              ? 'online'
              : health.status === 'degraded'
                ? 'degraded'
                : 'critical'
          }
          label={health.status.charAt(0).toUpperCase() + health.status.slice(1)}
          size="md"
        />
      </div>

      {/* ── KPI Row ────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard
          label="Active Cameras"
          value={kpis.activeCameras}
          unit={`/ ${cameras.length}`}
          status={
            kpis.activeCameras === cameras.length
              ? 'success'
              : kpis.activeCameras === 0
                ? 'critical'
                : 'warning'
          }
          delta={{ value: 0, label: 'stable' }}
        />
        <KpiCard
          label="Alerts Today"
          value={kpis.alertsToday}
          status={kpis.alertsToday > 10 ? 'critical' : kpis.alertsToday > 5 ? 'warning' : 'info'}
          delta={{ value: 2, label: '+2 vs yesterday' }}
        />
        <KpiCard
          label="Active Tracks"
          value={kpis.activeTracksNow}
          status="info"
        />
        <KpiCard
          label="Avg Latency"
          value={kpis.avgLatencyMs}
          unit="ms"
          status={kpis.avgLatencyMs > 100 ? 'critical' : kpis.avgLatencyMs > 50 ? 'warning' : 'success'}
          delta={{ value: -5, label: '-5ms vs 1h' }}
        />
        <KpiCard
          label="Dropped Frames"
          value={kpis.droppedFrames15m}
          unit="/ 15m"
          status={kpis.droppedFrames15m === 0 ? 'success' : 'warning'}
        />
      </div>

      {/* ── Attention Block ────────────────────────────────────────── */}
      <AttentionBlock cameras={cameras} health={health} events={events} />

      {/* ── Main Grid: Incidents + Cameras ─────────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-5">
        {/* Recent Incidents — spans 3 cols */}
        <div className="lg:col-span-3">
          <Card
            title="Recent Incidents"
            action={
              <a
                href="/events"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--primary))] hover:underline"
              >
                View all <ArrowRight className="h-3 w-3" />
              </a>
            }
          >
            <div className="-mx-4 -my-4">
              {events.map((evt, i) => (
                <div
                  key={evt.id}
                  className={cn(
                    'flex items-center gap-3 px-4 py-3 transition-colors hover:bg-[hsl(var(--muted))]/30',
                    i < events.length - 1 && 'border-b border-[hsl(var(--border))]',
                  )}
                >
                  {/* Severity */}
                  <div className="shrink-0">
                    <SeverityBadge severity={evt.severity} />
                  </div>

                  {/* Summary + Camera */}
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-xs font-medium text-[hsl(var(--foreground))]">
                      {evt.summary}
                    </p>
                    <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                      <span className="inline-flex items-center gap-1">
                        <Video className="inline h-2.5 w-2.5" />
                        {evt.cameraName}
                      </span>
                      <span className="mx-1.5">·</span>
                      <span className="inline-flex items-center gap-1">
                        <Clock className="inline h-2.5 w-2.5" />
                        {formatRelativeTime(evt.timestampStart)}
                      </span>
                    </p>
                  </div>

                  {/* Review status */}
                  <div className="shrink-0">
                    <ReviewBadge status={evt.reviewStatus} />
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Camera Status — spans 2 cols */}
        <div className="lg:col-span-2">
          <Card
            title="Camera Status"
            action={
              <a
                href="/live"
                className="inline-flex items-center gap-1 text-[10px] font-medium text-[hsl(var(--primary))] hover:underline"
              >
                Live view <ExternalLink className="h-3 w-3" />
              </a>
            }
          >
            <div className="space-y-3">
              {cameras.map((cam) => (
                <div
                  key={cam.id}
                  className="rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-3"
                >
                  <div className="flex items-start justify-between">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <Camera className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                        <span className="text-xs font-semibold text-[hsl(var(--foreground))]">
                          {cam.name}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-1 text-[10px] text-[hsl(var(--muted-foreground))]">
                        <MapPin className="h-2.5 w-2.5" />
                        {cam.location}
                      </div>
                    </div>
                    <StatusBadge status={cam.status} />
                  </div>

                  {/* Metrics row */}
                  <div className="mt-2.5 flex items-center gap-4 text-[10px]">
                    <div className="flex items-center gap-1">
                      <FrameIcon className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                      <span className="font-medium text-[hsl(var(--foreground))]">
                        {cam.fps}
                      </span>
                      <span className="text-[hsl(var(--muted-foreground))]">fps</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Gauge className="h-2.5 w-2.5 text-[hsl(var(--muted-foreground))]" />
                      <span
                        className={cn(
                          'font-medium',
                          cam.latencyMs > 80
                            ? 'text-amber-400'
                            : cam.latencyMs === 0
                              ? 'text-red-400'
                              : 'text-emerald-400',
                        )}
                      >
                        {cam.latencyMs}
                      </span>
                      <span className="text-[hsl(var(--muted-foreground))]">ms</span>
                    </div>
                    {cam.resolution && (
                      <span className="text-[hsl(var(--muted-foreground))]">
                        {cam.resolution}
                      </span>
                    )}
                  </div>

                  {cam.activePresetName && (
                    <div className="mt-2 inline-flex items-center rounded bg-[hsl(var(--muted))]/50 px-1.5 py-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                      <Zap className="mr-1 h-2.5 w-2.5" />
                      {cam.activePresetName}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>

      {/* ── Health Overview + Quick Shortcuts ──────────────────────── */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Health Overview — spans 2 cols */}
        <div className="lg:col-span-2">
          <Card title="Health Overview">
            <div className="grid gap-6 sm:grid-cols-2">
              {/* Services */}
              <div>
                <h4 className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Services
                </h4>
                <div className="space-y-2">
                  {health.services.map((svc) => (
                    <div
                      key={svc.name}
                      className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-3 py-2"
                    >
                      <div className="flex items-center gap-2">
                        {svc.status === 'up' ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                        ) : svc.status === 'degraded' ? (
                          <AlertCircle className="h-3.5 w-3.5 text-amber-400" />
                        ) : (
                          <XCircle className="h-3.5 w-3.5 text-red-400" />
                        )}
                        <span className="text-xs font-medium text-[hsl(var(--foreground))]">
                          {svc.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        {svc.latencyMs !== null && (
                          <span
                            className={cn(
                              'text-[10px] tabular-nums font-medium',
                              svc.latencyMs > 100
                                ? 'text-amber-400'
                                : 'text-[hsl(var(--muted-foreground))]',
                            )}
                          >
                            {svc.latencyMs}ms
                          </span>
                        )}
                        <StatusBadge
                          status={
                            svc.status === 'up'
                              ? 'online'
                              : svc.status === 'degraded'
                                ? 'degraded'
                                : 'offline'
                          }
                        />
                      </div>
                    </div>
                  ))}
                </div>

                {/* Inference summary */}
                <div className="mt-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-3">
                  <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Inference — {health.inference.modelName}
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-semibold tabular-nums text-teal-400">
                        {health.inference.latencyP50Ms}
                      </p>
                      <p className="text-[9px] text-[hsl(var(--muted-foreground))]">
                        P50 ms
                      </p>
                    </div>
                    <div>
                      <p className="text-sm font-semibold tabular-nums text-teal-400">
                        {health.inference.throughputFps}
                      </p>
                      <p className="text-[9px] text-[hsl(var(--muted-foreground))]">
                        FPS
                      </p>
                    </div>
                    <div>
                      <p
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          health.inference.queueDepth > 5
                            ? 'text-amber-400'
                            : 'text-emerald-400',
                        )}
                      >
                        {health.inference.queueDepth}
                      </p>
                      <p className="text-[9px] text-[hsl(var(--muted-foreground))]">
                        Queue
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Resources */}
              <div>
                <h4 className="mb-2.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                  Resources
                </h4>
                <div className="space-y-3">
                  <ResourceBar
                    label="CPU"
                    value={health.resources.cpuPercent}
                    unit="%"
                    icon={Cpu}
                  />
                  {health.resources.gpuPercent !== null && (
                    <ResourceBar
                      label="GPU"
                      value={health.resources.gpuPercent}
                      unit="%"
                      icon={Zap}
                    />
                  )}
                  <ResourceBar
                    label="RAM"
                    value={health.resources.ramMb}
                    max={health.resources.ramTotalMb}
                    unit="MB"
                    icon={Server}
                  />
                  <ResourceBar
                    label="Disk"
                    value={health.resources.diskPercent}
                    unit="%"
                    icon={HardDrive}
                  />
                </div>

                {/* Camera breakdown */}
                <div className="mt-4 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 p-3">
                  <h4 className="mb-2 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
                    Camera Breakdown
                  </h4>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-sm font-semibold tabular-nums text-emerald-400">
                        {health.cameras.online}
                      </p>
                      <p className="text-[9px] text-[hsl(var(--muted-foreground))]">
                        Online
                      </p>
                    </div>
                    <div>
                      <p
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          health.cameras.offline > 0
                            ? 'text-red-400'
                            : 'text-emerald-400',
                        )}
                      >
                        {health.cameras.offline}
                      </p>
                      <p className="text-[9px] text-[hsl(var(--muted-foreground))]">
                        Offline
                      </p>
                    </div>
                    <div>
                      <p
                        className={cn(
                          'text-sm font-semibold tabular-nums',
                          health.cameras.degraded > 0
                            ? 'text-amber-400'
                            : 'text-emerald-400',
                        )}
                      >
                        {health.cameras.degraded}
                      </p>
                      <p className="text-[9px] text-[hsl(var(--muted-foreground))]">
                        Degraded
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Quick Shortcuts — 1 col */}
        <div className="lg:col-span-1">
          <Card title="Quick Access">
            <div className="space-y-2">
              {shortcuts.map((sc) => {
                const Icon = sc.icon;
                return (
                  <a
                    key={sc.href}
                    href={sc.href}
                    className="group flex items-center gap-3 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-3 py-2.5 transition-colors hover:border-[hsl(var(--primary))]/40 hover:bg-[hsl(var(--primary))]/5"
                  >
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[hsl(var(--primary))]/10 text-[hsl(var(--primary))] transition-colors group-hover:bg-[hsl(var(--primary))]/20">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[hsl(var(--foreground))]">
                        {sc.label}
                      </p>
                      <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                        {sc.description}
                      </p>
                    </div>
                    <ArrowRight className="h-3.5 w-3.5 shrink-0 text-[hsl(var(--muted-foreground))] transition-transform group-hover:translate-x-0.5 group-hover:text-[hsl(var(--primary))]" />
                  </a>
                );
              })}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
