'use client';

import { useState, useMemo } from 'react';
import {
  X,
  Filter,
  Clock,
  Video,
  ChevronDown,
  ChevronRight,
  Search,
  CheckSquare,
  Shield,
  Eye,
  EyeOff,
  ArrowUpRight,
  Box,
  Crosshair,
  Link2,
  FileJson,
  History,
} from 'lucide-react';
import { SeverityBadge, EmptyState } from '@/components/ui';
import { cn } from '@/lib/utils';
import { mockEventsExtended, mockEventDetail } from '@/lib/mock-data';
import { useEvents } from '@/hooks/use-api';
import type { EventSeverity, ReviewStatus, EventListItem, EventDetail } from '@motionops/types';

/* ─── Constants ────────────────────────────────────────────────────── */

const ALL_SEVERITIES: EventSeverity[] = ['info', 'low', 'medium', 'high', 'critical'];
const ALL_REVIEW_STATUSES: ReviewStatus[] = ['unreviewed', 'confirmed', 'false_positive', 'ignored', 'escalated'];
const ALL_OBJECT_CLASSES = ['all', 'person', 'car', 'truck', 'bicycle'] as const;

const CAMERAS = [
  { id: 'all', name: 'All Cameras' },
  { id: 'cam-1', name: 'Entree Nord' },
  { id: 'cam-2', name: 'Parking B2' },
  { id: 'cam-3', name: 'Couloir Est' },
];

/* ─── Helpers ──────────────────────────────────────────────────────── */

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

function formatTimestamp(isoString: string | null): string {
  if (!isoString) return '--';
  const d = new Date(isoString);
  return d.toLocaleString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
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

/* ─── Filter State Type ────────────────────────────────────────────── */

interface Filters {
  dateFrom: string;
  dateTo: string;
  cameraId: string;
  severities: Set<EventSeverity>;
  reviewStatuses: Set<ReviewStatus>;
  objectClass: string;
}

const defaultFilters: Filters = {
  dateFrom: '',
  dateTo: '',
  cameraId: 'all',
  severities: new Set<EventSeverity>(),
  reviewStatuses: new Set<ReviewStatus>(),
  objectClass: 'all',
};

/* ─── Filters Panel ────────────────────────────────────────────────── */

function FiltersPanel({
  filters,
  onChange,
  onClear,
}: {
  filters: Filters;
  onChange: (f: Filters) => void;
  onClear: () => void;
}) {
  const hasActiveFilters =
    filters.dateFrom !== '' ||
    filters.dateTo !== '' ||
    filters.cameraId !== 'all' ||
    filters.severities.size > 0 ||
    filters.reviewStatuses.size > 0 ||
    filters.objectClass !== 'all';

  function toggleSeverity(s: EventSeverity) {
    const next = new Set(filters.severities);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange({ ...filters, severities: next });
  }

  function toggleReviewStatus(s: ReviewStatus) {
    const next = new Set(filters.reviewStatuses);
    if (next.has(s)) next.delete(s);
    else next.add(s);
    onChange({ ...filters, reviewStatuses: next });
  }

  return (
    <aside className="w-64 shrink-0 space-y-5 overflow-y-auto border-r border-[hsl(var(--border))] pr-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Filters
          </h2>
        </div>
        {hasActiveFilters && (
          <button
            onClick={onClear}
            className="text-[10px] font-medium text-[hsl(var(--primary))] hover:underline"
          >
            Clear all
          </button>
        )}
      </div>

      {/* Date range */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
          Date Range
        </label>
        <div className="space-y-1.5">
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-2.5 py-1.5 text-[11px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 focus:ring-1 focus:ring-[hsl(var(--primary))]/30"
            placeholder="From"
          />
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
            className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-2.5 py-1.5 text-[11px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 focus:ring-1 focus:ring-[hsl(var(--primary))]/30"
            placeholder="To"
          />
        </div>
      </div>

      {/* Camera select */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
          Camera
        </label>
        <select
          value={filters.cameraId}
          onChange={(e) => onChange({ ...filters, cameraId: e.target.value })}
          className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-2.5 py-1.5 text-[11px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 focus:ring-1 focus:ring-[hsl(var(--primary))]/30"
        >
          {CAMERAS.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>

      {/* Severity checkboxes */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
          Severity
        </label>
        <div className="space-y-1">
          {ALL_SEVERITIES.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-[hsl(var(--muted))]/30"
            >
              <input
                type="checkbox"
                checked={filters.severities.has(s)}
                onChange={() => toggleSeverity(s)}
                className="h-3 w-3 rounded border-[hsl(var(--border))] accent-[hsl(var(--primary))]"
              />
              <SeverityBadge severity={s} />
            </label>
          ))}
        </div>
      </div>

      {/* Review status checkboxes */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
          Review Status
        </label>
        <div className="space-y-1">
          {ALL_REVIEW_STATUSES.map((s) => (
            <label
              key={s}
              className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 transition-colors hover:bg-[hsl(var(--muted))]/30"
            >
              <input
                type="checkbox"
                checked={filters.reviewStatuses.has(s)}
                onChange={() => toggleReviewStatus(s)}
                className="h-3 w-3 rounded border-[hsl(var(--border))] accent-[hsl(var(--primary))]"
              />
              <ReviewBadge status={s} />
            </label>
          ))}
        </div>
      </div>

      {/* Object class select */}
      <div className="space-y-2">
        <label className="text-[11px] font-medium text-[hsl(var(--muted-foreground))]">
          Object Class
        </label>
        <select
          value={filters.objectClass}
          onChange={(e) => onChange({ ...filters, objectClass: e.target.value })}
          className="w-full rounded-md border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 px-2.5 py-1.5 text-[11px] text-[hsl(var(--foreground))] outline-none focus:border-[hsl(var(--primary))]/50 focus:ring-1 focus:ring-[hsl(var(--primary))]/30"
        >
          {ALL_OBJECT_CLASSES.map((c) => (
            <option key={c} value={c}>
              {c === 'all' ? 'All Classes' : c.charAt(0).toUpperCase() + c.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </aside>
  );
}

/* ─── Event List ───────────────────────────────────────────────────── */

function EventList({
  events,
  selectedId,
  onSelect,
}: {
  events: EventListItem[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      {/* List header */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2.5">
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 text-[hsl(var(--muted-foreground))]" />
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Events
          </h2>
        </div>
        <span className="rounded-full bg-[hsl(var(--muted))]/50 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[hsl(var(--muted-foreground))]">
          {events.length} event{events.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* List body */}
      {events.length === 0 ? (
        <div className="flex-1 p-6">
          <EmptyState
            icon={Search}
            title="No events match current filters"
            description="Try adjusting your filter criteria to see more results."
          />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto">
          {events.map((evt, i) => (
            <button
              key={evt.id}
              onClick={() => onSelect(evt.id)}
              className={cn(
                'flex w-full items-center gap-3 px-4 py-3 text-left transition-colors',
                i < events.length - 1 && 'border-b border-[hsl(var(--border))]',
                selectedId === evt.id
                  ? 'bg-[hsl(var(--primary))]/8 border-l-2 border-l-[hsl(var(--primary))]'
                  : 'hover:bg-[hsl(var(--muted))]/30',
              )}
            >
              {/* Severity */}
              <div className="shrink-0">
                <SeverityBadge severity={evt.severity} />
              </div>

              {/* Summary + meta */}
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-[hsl(var(--foreground))]">
                  {evt.summary}
                </p>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-[hsl(var(--muted-foreground))]">
                  <span className="inline-flex items-center gap-1">
                    <Video className="inline h-2.5 w-2.5" />
                    {evt.cameraName}
                  </span>
                  <span>·</span>
                  <span className="inline-flex items-center gap-1">
                    <Clock className="inline h-2.5 w-2.5" />
                    {formatRelativeTime(evt.timestampStart)}
                  </span>
                  {evt.objectClass && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        <Box className="inline h-2.5 w-2.5" />
                        {evt.objectClass}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Review status */}
              <div className="shrink-0">
                <ReviewBadge status={evt.reviewStatus} />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ─── Detail Panel ─────────────────────────────────────────────────── */

function DetailPanel({
  detail,
  reviewStatus,
  onClose,
  onReview,
}: {
  detail: EventDetail | null;
  reviewStatus: ReviewStatus;
  onClose: () => void;
  onReview: (status: ReviewStatus) => void;
}) {
  const [configExpanded, setConfigExpanded] = useState(false);

  if (!detail) {
    return (
      <aside className="flex w-96 shrink-0 flex-col items-center justify-center border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]/30 px-6 text-center">
        <Eye className="h-8 w-8 text-[hsl(var(--muted-foreground))]/40" />
        <p className="mt-3 text-sm text-[hsl(var(--muted-foreground))]">
          Select an event to view details
        </p>
      </aside>
    );
  }

  const reviewButtons: Array<{ status: ReviewStatus; label: string; icon: React.ElementType; color: string }> = [
    { status: 'confirmed', label: 'Confirmed', icon: CheckSquare, color: 'hover:bg-emerald-500/15 hover:text-emerald-400 hover:border-emerald-500/30' },
    { status: 'false_positive', label: 'False +', icon: EyeOff, color: 'hover:bg-amber-500/15 hover:text-amber-400 hover:border-amber-500/30' },
    { status: 'ignored', label: 'Ignored', icon: EyeOff, color: 'hover:bg-zinc-500/15 hover:text-zinc-400 hover:border-zinc-500/30' },
    { status: 'escalated', label: 'Escalated', icon: ArrowUpRight, color: 'hover:bg-red-500/15 hover:text-red-400 hover:border-red-500/30' },
  ];

  return (
    <aside className="flex w-96 shrink-0 flex-col border-l border-[hsl(var(--border))] bg-[hsl(var(--card))]/30">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-3">
        <div className="flex items-center gap-2">
          <SeverityBadge severity={detail.severity} />
          <span className="text-xs font-medium text-[hsl(var(--foreground))]">
            {detail.type.replace(/_/g, ' ')}
          </span>
          <span className="text-[10px] text-[hsl(var(--muted-foreground))]">
            {formatRelativeTime(detail.timestampStart)}
          </span>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-[hsl(var(--muted-foreground))] transition-colors hover:bg-[hsl(var(--muted))]/50 hover:text-[hsl(var(--foreground))]"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
        {/* Summary */}
        <div>
          <h3 className="text-sm font-semibold text-[hsl(var(--foreground))]">
            {detail.summary}
          </h3>
          <div className="mt-1">
            <ReviewBadge status={reviewStatus} />
          </div>
        </div>

        {/* Camera */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Camera
          </p>
          <div className="flex items-center gap-2">
            <Video className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
            <span className="text-xs text-[hsl(var(--foreground))]">{detail.cameraName}</span>
            <span className="text-[10px] text-[hsl(var(--muted-foreground))]">({detail.cameraId})</span>
          </div>
        </div>

        {/* Timestamps */}
        <div className="space-y-1">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Timestamps
          </p>
          <div className="space-y-0.5 text-xs text-[hsl(var(--foreground))]">
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Start</span>
              <span className="tabular-nums">{formatTimestamp(detail.timestampStart)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">End</span>
              <span className="tabular-nums">{formatTimestamp(detail.timestampEnd)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[hsl(var(--muted-foreground))]">Created</span>
              <span className="tabular-nums">{formatTimestamp(detail.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Object + Confidence */}
        {(detail.objectClass || detail.confidence !== null) && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Detection
            </p>
            <div className="flex items-center gap-3 text-xs text-[hsl(var(--foreground))]">
              {detail.objectClass && (
                <div className="flex items-center gap-1.5">
                  <Box className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                  <span className="capitalize">{detail.objectClass}</span>
                </div>
              )}
              {detail.confidence !== null && (
                <div className="flex items-center gap-1.5">
                  <Crosshair className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
                  <span className="tabular-nums">{(detail.confidence * 100).toFixed(0)}%</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Bounding box */}
        {detail.bbox && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Bounding Box
            </p>
            <div className="grid grid-cols-4 gap-1.5">
              {(['x', 'y', 'w', 'h'] as const).map((k) => (
                <div
                  key={k}
                  className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-2 py-1 text-center"
                >
                  <span className="text-[9px] uppercase text-[hsl(var(--muted-foreground))]">{k}</span>
                  <p className="text-xs font-semibold tabular-nums text-[hsl(var(--foreground))]">
                    {detail.bbox![k]}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Rule name */}
        {detail.ruleName && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Rule
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))]">
              <Shield className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
              {detail.ruleName}
            </div>
          </div>
        )}

        {/* Related events */}
        {detail.relatedEventIds.length > 0 && (
          <div className="space-y-1">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Related Events
            </p>
            <div className="flex items-center gap-1.5 text-xs text-[hsl(var(--foreground))]">
              <Link2 className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
              {detail.relatedEventIds.length} related event{detail.relatedEventIds.length !== 1 ? 's' : ''}
            </div>
          </div>
        )}

        {/* Config snapshot (collapsible) */}
        {detail.configSnapshot && (
          <div className="space-y-1">
            <button
              onClick={() => setConfigExpanded(!configExpanded)}
              className="flex w-full items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] transition-colors hover:text-[hsl(var(--foreground))]"
            >
              <FileJson className="h-3 w-3" />
              Config Snapshot
              {configExpanded ? (
                <ChevronDown className="ml-auto h-3 w-3" />
              ) : (
                <ChevronRight className="ml-auto h-3 w-3" />
              )}
            </button>
            {configExpanded && (
              <pre className="max-h-40 overflow-auto rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/30 p-2.5 text-[10px] leading-relaxed text-[hsl(var(--foreground))]">
                {JSON.stringify(detail.configSnapshot, null, 2)}
              </pre>
            )}
          </div>
        )}

        {/* Review Section */}
        <div className="space-y-2 border-t border-[hsl(var(--border))] pt-4">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            Review Actions
          </p>
          <div className="grid grid-cols-2 gap-1.5">
            {reviewButtons.map((btn) => {
              const Icon = btn.icon;
              const isActive = reviewStatus === btn.status;
              return (
                <button
                  key={btn.status}
                  onClick={() => onReview(btn.status)}
                  className={cn(
                    'flex items-center justify-center gap-1.5 rounded-md border px-2.5 py-2 text-[11px] font-medium transition-all',
                    isActive
                      ? btn.status === 'confirmed'
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-400'
                        : btn.status === 'false_positive'
                          ? 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                          : btn.status === 'escalated'
                            ? 'border-red-500/40 bg-red-500/15 text-red-400'
                            : 'border-zinc-500/40 bg-zinc-500/15 text-zinc-400'
                      : cn(
                          'border-[hsl(var(--border))] bg-transparent text-[hsl(var(--muted-foreground))]',
                          btn.color,
                        ),
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {btn.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Review history */}
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <History className="h-3 w-3 text-[hsl(var(--muted-foreground))]" />
            <p className="text-[10px] font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
              Review History
            </p>
          </div>
          {detail.reviewHistory.length === 0 ? (
            <p className="text-[11px] italic text-[hsl(var(--muted-foreground))]">
              No review history yet.
            </p>
          ) : (
            <div className="space-y-1.5">
              {detail.reviewHistory.map((entry, i) => (
                <div
                  key={i}
                  className="rounded border border-[hsl(var(--border))] bg-[hsl(var(--muted))]/20 px-2.5 py-1.5"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="font-medium text-[hsl(var(--foreground))]">{entry.reviewer}</span>
                    <span className="text-[hsl(var(--muted-foreground))]">
                      {formatRelativeTime(entry.timestamp)}
                    </span>
                  </div>
                  <p className="text-[10px] text-[hsl(var(--muted-foreground))]">
                    {entry.action}
                    {entry.notes && ` - ${entry.notes}`}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
}

/* ─── Page Component ───────────────────────────────────────────────── */

export default function EventsPage() {
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [localReviewStatus, setLocalReviewStatus] = useState<ReviewStatus>(
    mockEventDetail.reviewStatus,
  );

  const { data: apiEvents } = useEvents({
    cameraId: filters.cameraId,
    objectClass: filters.objectClass,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    limit: 100,
  });
  const allEvents = apiEvents?.data || mockEventsExtended;

  // Filter events based on active filters
  const filteredEvents = useMemo(() => {
    return allEvents.filter((evt) => {
      // Date range filter
      if (filters.dateFrom) {
        const from = new Date(filters.dateFrom).getTime();
        if (new Date(evt.timestampStart).getTime() < from) return false;
      }
      if (filters.dateTo) {
        const to = new Date(filters.dateTo).getTime() + 86400000; // end of day
        if (new Date(evt.timestampStart).getTime() > to) return false;
      }

      // Camera filter
      if (filters.cameraId !== 'all' && evt.cameraId !== filters.cameraId) return false;

      // Severity filter
      if (filters.severities.size > 0 && !filters.severities.has(evt.severity)) return false;

      // Review status filter
      if (filters.reviewStatuses.size > 0 && !filters.reviewStatuses.has(evt.reviewStatus)) return false;

      // Object class filter
      if (filters.objectClass !== 'all') {
        if (evt.objectClass !== filters.objectClass) return false;
      }

      return true;
    });
  }, [filters, allEvents]);

  // Get the detail for the selected event (mock: always returns mockEventDetail for evt-1, simulated for others)
  const selectedDetail: EventDetail | null = useMemo(() => {
    if (!selectedEventId) return null;
    if (selectedEventId === 'evt-1') return mockEventDetail;

    // For other events, build a simulated detail from the list item
    const evt = allEvents.find((e) => e.id === selectedEventId);
    if (!evt) return null;

    return {
      id: evt.id,
      type: evt.type,
      severity: evt.severity,
      summary: evt.summary,
      cameraId: evt.cameraId,
      cameraName: evt.cameraName,
      timestampStart: evt.timestampStart,
      timestampEnd: null,
      createdAt: evt.timestampStart,
      objectClass: evt.objectClass,
      confidence: evt.confidence,
      bbox: evt.objectClass ? { x: 100, y: 60, w: 50, h: 120 } : null,
      reviewStatus: evt.reviewStatus,
      reviewedBy: null,
      reviewedAt: null,
      reviewNotes: null,
      tracks: [],
      configSnapshot: null,
      clipUrl: null,
      snapshotUrl: null,
      thumbnailUrl: null,
      ruleId: evt.type === 'rule_triggered' ? 'rule-1' : null,
      ruleName: evt.type === 'rule_triggered' ? 'Auto-generated rule' : null,
      relatedEventIds: [],
      reviewHistory: [],
    };
  }, [selectedEventId, allEvents]);

  function handleClearFilters() {
    setFilters({
      dateFrom: '',
      dateTo: '',
      cameraId: 'all',
      severities: new Set<EventSeverity>(),
      reviewStatuses: new Set<ReviewStatus>(),
      objectClass: 'all',
    });
  }

  function handleSelectEvent(id: string) {
    setSelectedEventId(id);
    // Reset review status to the event's actual status
    const evt = allEvents.find((e) => e.id === id);
    if (evt) {
      setLocalReviewStatus(evt.reviewStatus);
    }
  }

  function handleReview(status: ReviewStatus) {
    setLocalReviewStatus(status);
    // In a real app, this would call the API
  }

  return (
    <div className="flex h-[calc(100vh-7rem)] gap-0">
      {/* Left: Filters */}
      <FiltersPanel
        filters={filters}
        onChange={setFilters}
        onClear={handleClearFilters}
      />

      {/* Center: Event list */}
      <div className="flex flex-1 flex-col overflow-hidden rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] mx-4">
        <EventList
          events={filteredEvents}
          selectedId={selectedEventId}
          onSelect={handleSelectEvent}
        />
      </div>

      {/* Right: Detail panel */}
      <DetailPanel
        detail={selectedDetail}
        reviewStatus={localReviewStatus}
        onClose={() => setSelectedEventId(null)}
        onReview={handleReview}
      />
    </div>
  );
}
