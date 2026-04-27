import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoCard } from './MoCard';

/**
 * EventCard — full event surface for the live monitoring right panel.
 * Reproduces the `.event-card` pattern from
 * docs/02-ux/frontend-handoff/live-monitoring-mockup.html (Zone Intrusion /
 * Loitering / Vehicle Detected trio).
 *
 * Layout (composed on MoCard):
 *  - head row: severity dot (6px, glow when critical/info) + type label
 *    colored by severity + monospace time pushed to the right
 *  - meta row: secondary context (cam + detail + confidence) in muted 11px
 *  - actions row: Confirm / False+ / Escalate buttons with keyboard hint
 *    prefix (C / F / E). Styled after `.action-btn` in the mockup.
 *
 * When `severity === 'critical'`, the card picks up
 * `box-shadow: var(--mo-glow-critical)` and `border-color: var(--mo-border-critical)`
 * to signal high urgency — matching the mockup's Zone Intrusion treatment.
 */
export type EventCardSeverity = 'critical' | 'warning' | 'info' | 'success';

const DOT_COLOR: Record<EventCardSeverity, string> = {
  critical: 'var(--mo-accent-critical)',
  warning: 'var(--mo-accent-warning)',
  info: 'var(--mo-accent-primary)',
  success: 'var(--mo-accent-success)',
};

const TYPE_COLOR_CLASS: Record<EventCardSeverity, string> = {
  critical: 'text-[var(--mo-accent-critical)]',
  warning: 'text-[var(--mo-accent-warning)]',
  info: 'text-[var(--mo-accent-primary)]',
  success: 'text-[var(--mo-accent-success)]',
};

// Dots get a matching-colored glow on critical / info (matches mockup).
const DOT_HAS_GLOW: Record<EventCardSeverity, boolean> = {
  critical: true,
  warning: false,
  info: true,
  success: false,
};

export interface EventCardProps extends HTMLAttributes<HTMLDivElement> {
  severity: EventCardSeverity;
  type: string;
  time: string;
  meta: ReactNode;
  onConfirm?: () => void;
  onReject?: () => void;
  onEscalate?: () => void;
  className?: string;
}

const ACTION_BTN_BASE =
  'flex-1 rounded-[var(--mo-radius-xs)] border border-[var(--mo-border-subtle)] bg-[var(--mo-bg-input)] px-2 py-1 text-[10px] font-medium transition-colors hover:bg-[rgba(255,255,255,0.05)] focus:outline-none focus-visible:border-[var(--mo-border-accent)]';

export const EventCard = forwardRef<HTMLDivElement, EventCardProps>(
  (
    {
      severity,
      type,
      time,
      meta,
      onConfirm,
      onReject,
      onEscalate,
      className,
      style,
      ...props
    },
    ref,
  ) => {
    const isCritical = severity === 'critical';
    const dotColor = DOT_COLOR[severity];

    return (
      <MoCard
        ref={ref}
        interactive
        className={cn('flex flex-col gap-1.5 p-3', className)}
        style={
          isCritical
            ? {
                boxShadow: 'var(--mo-glow-critical)',
                borderColor: 'var(--mo-border-critical)',
                ...style,
              }
            : style
        }
        {...props}
      >
        <div className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: dotColor,
              boxShadow: DOT_HAS_GLOW[severity] ? `0 0 6px ${dotColor}` : undefined,
            }}
          />
          <span
            className={cn(
              'text-[12px] font-semibold',
              TYPE_COLOR_CLASS[severity],
            )}
          >
            {type}
          </span>
          <span className="ml-auto font-mono text-[10px] text-[var(--mo-fg-muted)]">
            {time}
          </span>
        </div>

        <div className="text-[11px] text-[var(--mo-fg-muted)]">{meta}</div>

        <div className="mt-1 flex gap-1">
          <button
            type="button"
            onClick={onConfirm}
            className={cn(
              ACTION_BTN_BASE,
              'text-[var(--mo-accent-success)]',
            )}
          >
            <span className="font-mono opacity-80">C</span> Confirm
          </button>
          <button
            type="button"
            onClick={onReject}
            className={cn(
              ACTION_BTN_BASE,
              'text-[var(--mo-accent-critical)]',
            )}
          >
            <span className="font-mono opacity-80">F</span> False +
          </button>
          <button
            type="button"
            onClick={onEscalate}
            className={cn(ACTION_BTN_BASE, 'text-[var(--mo-fg-secondary)]')}
          >
            <span className="font-mono opacity-80">E</span> Escalate
          </button>
        </div>
      </MoCard>
    );
  },
);
EventCard.displayName = 'EventCard';
