'use client';

import {
  Activity,
  Cpu,
  Zap,
  Server,
  HardDrive,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Camera,
  Brain,
  Clock,
  Gauge,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { KpiCard, StatusBadge, Card, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { mockHealth } from '@/lib/mock-data';
import { useHealth } from '@/hooks/use-api';

/* -- Helpers ----------------------------------------------------------- */

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

/* -- Resource Bar ------------------------------------------------------ */

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
  const bgGlow =
    percent >= 90
      ? 'bg-red-500/5'
      : percent >= 70
        ? 'bg-amber-500/5'
        : 'bg-emerald-500/5';

  return (
    <div className={cn('space-y-2 rounded-md border border-[hsl(var(--border))] p-3', bgGlow)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={cn('flex h-6 w-6 items-center justify-center rounded-md', bgGlow)}>
            <Icon className={cn('h-3.5 w-3.5', textColor)} />
          </div>
          <span className="text-xs font-medium text-[hsl(var(--foreground))]">
            {label}
          </span>
        </div>
        <div className="flex items-center gap-2">
          {max && (
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
              {value} / {max} {unit}
            </span>
          )}
          <span className={cn('text-sm font-bold tabular-nums', textColor)}>
            {percent}%
          </span>
        </div>
      </div>
      <div className="h-2 rounded-full bg-[hsl(var(--muted))]">
        <div
          className={cn('h-full rounded-full transition-all', barColor)}
          style={{ width: `${Math.min(percent, 100)}%` }}
        />
      </div>
    </div>
  );
}

/* -- Page Component ---------------------------------------------------- */

export default function HealthPage() {
  const { data: apiHealth } = useHealth();
  const health = apiHealth || mockHealth;
  return (
    <div className="space-y-6">
      {/* -- Page Header ------------------------------------------------- */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold tracking-tight">
            System Health
          </h1>
          <p className="mt-0.5 text-xs text-[hsl(var(--muted-foreground))]">
            System observability and technical metrics — last checked{' '}
            <span className="font-medium text-[hsl(var(--foreground))]">
              {formatRelativeTime(health.timestamp)}
            </span>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge
            status={
              health.status === 'healthy'
                ? 'online'
                : health.status === 'degraded'
                  ? 'degraded'
                  : 'critical'
            }
            label={
              health.status.charAt(0).toUpperCase() + health.status.slice(1)
            }
            size="md"
          />
          <button className="flex items-center gap-1.5 rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--card))] px-3 py-1.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))] transition-colors hover:border-[hsl(var(--primary))]/40 hover:text-[hsl(var(--foreground))]">
            <RefreshCw className="h-3 w-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* -- Service Status Grid ----------------------------------------- */}
      <div>
        <h2 className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
          <Activity className="h-3.5 w-3.5" />
          Service Status
        </h2>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          {health.services.map((svc) => {
            const statusMap = {
              up: 'online' as const,
              degraded: 'degraded' as const,
              down: 'offline' as const,
            };
            const statusKey = statusMap[svc.status];
            const bgMap = {
              up: 'border-emerald-500/20',
              degraded: 'border-amber-500/20',
              down: 'border-red-500/20',
            };

            return (
              <div
                key={svc.name}
                className={cn(
                  'rounded-lg border bg-[hsl(var(--card))] p-4 transition-colors',
                  bgMap[svc.status],
                )}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {svc.status === 'up' ? (
                      <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                    ) : svc.status === 'degraded' ? (
                      <AlertCircle className="h-4 w-4 text-amber-400" />
                    ) : (
                      <XCircle className="h-4 w-4 text-red-400" />
                    )}
                    <span className="text-sm font-semibold text-[hsl(var(--foreground))]">
                      {svc.name}
                    </span>
                  </div>
                  <StatusBadge status={statusKey} />
                </div>
                <div className="mt-3 flex items-center gap-3">
                  {svc.latencyMs !== null && (
                    <div className="flex items-center gap-1">
                      <Gauge className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                      <span
                        className={cn(
                          'text-xs font-medium tabular-nums',
                          svc.latencyMs > 100
                            ? 'text-amber-400'
                            : 'text-[hsl(var(--muted-foreground))]',
                        )}
                      >
                        {svc.latencyMs}ms
                      </span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                    <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
                      {formatRelativeTime(svc.lastCheckAt)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* -- Resource Usage ---------------------------------------------- */}
      <Card title="Resource Usage">
        <div className="grid gap-3 sm:grid-cols-2">
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
      </Card>

      {/* -- Inference Metrics + Camera Status --------------------------- */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Inference Metrics -- 2 cols */}
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center gap-1.5">
            <Brain className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
            <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Inference Metrics
            </h2>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <KpiCard
              label="Model"
              value={health.inference.modelName}
              status="info"
            />
            <KpiCard
              label="P50 Latency"
              value={health.inference.latencyP50Ms}
              unit="ms"
              status={
                health.inference.latencyP50Ms > 50
                  ? 'warning'
                  : 'success'
              }
            />
            <KpiCard
              label="P95 Latency"
              value={health.inference.latencyP95Ms}
              unit="ms"
              status={
                health.inference.latencyP95Ms > 100
                  ? 'critical'
                  : health.inference.latencyP95Ms > 50
                    ? 'warning'
                    : 'success'
              }
            />
            <KpiCard
              label="Throughput"
              value={health.inference.throughputFps}
              unit="FPS"
              status={
                health.inference.throughputFps >= 20
                  ? 'success'
                  : health.inference.throughputFps >= 10
                    ? 'warning'
                    : 'critical'
              }
            />
            <KpiCard
              label="Queue Depth"
              value={health.inference.queueDepth}
              status={
                health.inference.queueDepth === 0
                  ? 'success'
                  : health.inference.queueDepth > 5
                    ? 'critical'
                    : 'warning'
              }
            />
            <KpiCard
              label="Dropped Frames 24h"
              value={health.inference.droppedFrames24h}
              status={
                health.inference.droppedFrames24h === 0
                  ? 'success'
                  : health.inference.droppedFrames24h > 10
                    ? 'critical'
                    : 'warning'
              }
            />
          </div>
        </div>

        {/* Camera Status -- 1 col */}
        <div className="lg:col-span-1">
          <Card title="Camera Status">
            <div className="space-y-4">
              {/* Summary counts */}
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="rounded-md border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-emerald-500" />
                    <span className="text-lg font-bold tabular-nums text-emerald-400">
                      {health.cameras.online}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                    Online
                  </p>
                </div>
                <div className="rounded-md border border-red-500/20 bg-red-500/5 p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-red-500" />
                    <span
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        health.cameras.offline > 0
                          ? 'text-red-400'
                          : 'text-emerald-400',
                      )}
                    >
                      {health.cameras.offline}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                    Offline
                  </p>
                </div>
                <div className="rounded-md border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-center justify-center gap-1.5">
                    <div className="h-2 w-2 rounded-full bg-amber-500" />
                    <span
                      className={cn(
                        'text-lg font-bold tabular-nums',
                        health.cameras.degraded > 0
                          ? 'text-amber-400'
                          : 'text-emerald-400',
                      )}
                    >
                      {health.cameras.degraded}
                    </span>
                  </div>
                  <p className="mt-0.5 text-[10px] font-medium text-[hsl(var(--muted-foreground))]">
                    Degraded
                  </p>
                </div>
              </div>

              {/* Total summary */}
              <div className="flex items-center justify-between rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-3 py-2">
                <div className="flex items-center gap-1.5">
                  <Camera className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
                  <span className="text-xs font-medium text-[hsl(var(--muted-foreground))]">
                    Total Cameras
                  </span>
                </div>
                <span className="text-sm font-bold tabular-nums text-[hsl(var(--foreground))]">
                  {health.cameras.total}
                </span>
              </div>

              {/* Health bar */}
              <div className="space-y-1">
                <div className="flex h-2 overflow-hidden rounded-full">
                  {health.cameras.online > 0 && (
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{
                        width: `${(health.cameras.online / health.cameras.total) * 100}%`,
                      }}
                    />
                  )}
                  {health.cameras.degraded > 0 && (
                    <div
                      className="bg-amber-500 transition-all"
                      style={{
                        width: `${(health.cameras.degraded / health.cameras.total) * 100}%`,
                      }}
                    />
                  )}
                  {health.cameras.offline > 0 && (
                    <div
                      className="bg-red-500 transition-all"
                      style={{
                        width: `${(health.cameras.offline / health.cameras.total) * 100}%`,
                      }}
                    />
                  )}
                </div>
                <div className="flex items-center justify-between text-[9px] text-[hsl(var(--muted-foreground))]">
                  <span>
                    {Math.round(
                      (health.cameras.online / health.cameras.total) * 100,
                    )}
                    % healthy
                  </span>
                  <span>
                    {health.cameras.online} / {health.cameras.total}
                  </span>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* -- Recent Errors ----------------------------------------------- */}
      <Card title="Recent Errors">
        {health.recentErrors.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No recent errors"
            description="All systems operating normally. No errors reported in the monitoring window."
          />
        ) : (
          <div className="-mx-4 -my-4">
            {health.recentErrors.map((err, i) => (
              <div
                key={`${err.source}-${err.timestamp}-${i}`}
                className={cn(
                  'flex items-center gap-3 px-4 py-3',
                  i < health.recentErrors.length - 1 &&
                    'border-b border-[hsl(var(--border))]',
                )}
              >
                <AlertTriangle className="h-3.5 w-3.5 shrink-0 text-red-400" />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-[hsl(var(--foreground))]">
                    {err.message}
                  </p>
                  <p className="mt-0.5 text-[10px] text-[hsl(var(--muted-foreground))]">
                    {err.source}
                    {err.code && (
                      <>
                        {' '}
                        <span className="rounded bg-red-500/10 px-1 py-0.5 font-mono text-[9px] text-red-400">
                          {err.code}
                        </span>
                      </>
                    )}
                    {err.count && err.count > 1 && (
                      <span className="ml-1.5 text-red-400">
                        ({err.count}x)
                      </span>
                    )}
                  </p>
                </div>
                <span className="shrink-0 text-[10px] text-[hsl(var(--muted-foreground))]">
                  {formatRelativeTime(err.timestamp)}
                </span>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
