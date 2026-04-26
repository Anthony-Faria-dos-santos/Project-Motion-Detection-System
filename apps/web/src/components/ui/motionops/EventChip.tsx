import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * EventChip — pill with leading dot used on the timeline and in compact event
 * contexts. Signature pattern issued from the Comet Surveillance reference.
 *
 * Variants by severity (semantic):
 *  - critical → magenta
 *  - warning  → amber
 *  - info     → cyan (primary)
 *  - success  → green
 *
 * Spec: docs/02-ux/02-design-system-functional.md "EventChip"
 * Pattern: docs/02-ux/06-visual-direction-inspiration.md §5.2
 */
export type EventChipSeverity = 'critical' | 'warning' | 'info' | 'success';

const VARIANT: Record<EventChipSeverity, string> = {
  critical:
    'bg-[var(--mo-accent-critical-soft)] text-[var(--mo-accent-critical)] border-[var(--mo-border-critical)]',
  warning:
    'bg-[var(--mo-accent-warning-soft)] text-[var(--mo-accent-warning)] border-[rgba(249,177,58,0.35)]',
  info: 'bg-[var(--mo-accent-primary-soft)] text-[var(--mo-accent-primary)] border-[var(--mo-border-accent)]',
  success:
    'bg-[var(--mo-accent-success-soft)] text-[var(--mo-accent-success)] border-[var(--mo-border-success)]',
};

const DOT_VARIANT: Record<EventChipSeverity, string> = {
  critical:
    'bg-[var(--mo-accent-critical)] shadow-[0_0_6px_var(--mo-accent-critical)]',
  warning: 'bg-[var(--mo-accent-warning)]',
  info: 'bg-[var(--mo-accent-primary)] shadow-[0_0_6px_var(--mo-accent-primary)]',
  success: 'bg-[var(--mo-accent-success)]',
};

export interface EventChipProps
  extends ButtonHTMLAttributes<HTMLButtonElement> {
  severity: EventChipSeverity;
  label: string;
  timestamp?: string;
  selected?: boolean;
  expired?: boolean;
}

export const EventChip = forwardRef<HTMLButtonElement, EventChipProps>(
  (
    { severity, label, timestamp, selected, expired, className, ...props },
    ref,
  ) => (
    <button
      ref={ref}
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 whitespace-nowrap rounded-[var(--mo-radius-xs)] border px-2.5 py-1 text-[11px] font-medium transition-[transform,box-shadow,border-color] duration-150',
        'hover:-translate-y-px hover:shadow-[0_4px_12px_rgba(0,0,0,0.4)]',
        VARIANT[severity],
        selected && 'border-[var(--mo-border-strong)] shadow-[var(--mo-glow-primary-subtle)]',
        expired && 'opacity-50 grayscale',
        className,
      )}
      {...props}
    >
      <span
        aria-hidden
        className={cn('inline-block h-1.5 w-1.5 rounded-full', DOT_VARIANT[severity])}
      />
      <span>{label}</span>
      {timestamp && (
        <span className="ml-1 font-mono text-[10px] opacity-70">{timestamp}</span>
      )}
    </button>
  ),
);
EventChip.displayName = 'EventChip';
