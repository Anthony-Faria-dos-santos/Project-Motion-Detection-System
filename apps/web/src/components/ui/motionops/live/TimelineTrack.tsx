import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';
import { EventChip, type EventChipSeverity } from '../EventChip';
import { TimelineRuler } from './TimelineRuler';
import { TimelinePlayhead } from './TimelinePlayhead';

/**
 * TimelineTrack — full timeline assembly for the live-monitoring view. Stitches
 * the header (title + range + static play controls) to the track body
 * containing a `TimelineRuler`, an `.event-lane` of absolutely-positioned
 * `EventChip`s, and a `TimelinePlayhead`. Reproduces `.timeline` +
 * `.timeline-header` + `.timeline-track` + `.event-lane` from
 * `docs/02-ux/frontend-handoff/live-monitoring-mockup.html`.
 *
 * Panel chrome: this component owns the full `.timeline` panel chrome
 * (bg-surface, subtle top border, space-4 padding, space-3 gap, flex column,
 * min-w-0). Drop it straight into the `timeline` grid area of the live layout.
 *
 * Multi-lane offset: chips are positioned at `top: 6 + (laneIndex ?? 0) * 24`
 * pixels inside `.event-lane` — 6px of top padding + one 24px row per extra
 * lane — matching the mockup where some chips sit at `top: 30px`.
 *
 * The play controls (Previous / Play / Next) are static per spec — no
 * interactivity wired up.
 */
export type TimelineEventSeverity = EventChipSeverity;

export interface TimelineEvent {
  id: string;
  leftPercent: number;
  laneIndex?: number;
  severity: TimelineEventSeverity;
  label: string;
  timestamp?: string;
}

export interface TimelineTrackProps extends HTMLAttributes<HTMLElement> {
  rangeLabel: string;
  ticks: string[];
  events: TimelineEvent[];
  currentPercent: number;
  onEventClick?: (eventId: string) => void;
}

const LANE_BASE_TOP = 6;
const LANE_ROW_HEIGHT = 24;

export const TimelineTrack = forwardRef<HTMLElement, TimelineTrackProps>(
  (
    {
      rangeLabel,
      ticks,
      events,
      currentPercent,
      onEventClick,
      className,
      ...props
    },
    ref,
  ) => (
    <section
      ref={ref}
      className={cn(
        'flex min-w-0 flex-col gap-[var(--mo-space-3)]',
        'bg-[var(--mo-bg-surface)] border-t border-[var(--mo-border-subtle)]',
        'p-[var(--mo-space-4)]',
        className,
      )}
      {...props}
    >
      {/* Header: title + range + static play controls */}
      <header className="flex items-center gap-[var(--mo-space-3)]">
        <h3 className="text-[13px] font-semibold tracking-[0.02em]">
          Timeline
        </h3>
        <span className="font-mono text-[11px] text-[var(--mo-fg-muted)]">
          {rangeLabel}
        </span>
        <div className="ml-auto flex gap-[var(--mo-space-1)]">
          <button
            type="button"
            title="Previous"
            aria-label="Previous"
            className={cn(
              'flex h-[28px] w-[28px] cursor-pointer items-center justify-center',
              'rounded-[var(--mo-radius-sm)] border border-[var(--mo-border-default)]',
              'bg-[var(--mo-bg-input)] text-[var(--mo-fg-secondary)]',
              'transition-colors duration-150',
              'hover:border-[var(--mo-border-accent)] hover:text-[var(--mo-accent-primary)]',
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path d="m9 4-4 3 4 3" />
            </svg>
          </button>
          <button
            type="button"
            title="Play"
            aria-label="Play"
            className={cn(
              'flex h-[28px] w-[28px] cursor-pointer items-center justify-center',
              'rounded-[var(--mo-radius-sm)] border border-[var(--mo-border-default)]',
              'bg-[var(--mo-bg-input)] text-[var(--mo-fg-secondary)]',
              'transition-colors duration-150',
              'hover:border-[var(--mo-border-accent)] hover:text-[var(--mo-accent-primary)]',
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="currentColor"
              aria-hidden
            >
              <path d="M4 3v8l7-4z" />
            </svg>
          </button>
          <button
            type="button"
            title="Next"
            aria-label="Next"
            className={cn(
              'flex h-[28px] w-[28px] cursor-pointer items-center justify-center',
              'rounded-[var(--mo-radius-sm)] border border-[var(--mo-border-default)]',
              'bg-[var(--mo-bg-input)] text-[var(--mo-fg-secondary)]',
              'transition-colors duration-150',
              'hover:border-[var(--mo-border-accent)] hover:text-[var(--mo-accent-primary)]',
            )}
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              aria-hidden
            >
              <path d="m5 4 4 3-4 3" />
            </svg>
          </button>
        </div>
      </header>

      {/* Track body: ruler + event lane + playhead */}
      <div
        className={cn(
          'relative min-h-0 flex-1 overflow-hidden',
          'rounded-[var(--mo-radius-md)] border border-[var(--mo-border-subtle)]',
          'bg-[var(--mo-bg-input)]',
        )}
      >
        <TimelineRuler ticks={ticks} />

        <div className="absolute bottom-0 left-0 right-0 top-[22px] overflow-hidden p-[6px]">
          {events.map((event) => {
            const lane = event.laneIndex ?? 0;
            const top = LANE_BASE_TOP + lane * LANE_ROW_HEIGHT;
            return (
              <EventChip
                key={event.id}
                severity={event.severity}
                label={event.label}
                timestamp={event.timestamp}
                onClick={() => onEventClick?.(event.id)}
                className="absolute"
                style={{ left: `${event.leftPercent}%`, top: `${top}px` }}
              />
            );
          })}
        </div>

        <TimelinePlayhead leftPercent={currentPercent} />
      </div>
    </section>
  ),
);
TimelineTrack.displayName = 'TimelineTrack';
