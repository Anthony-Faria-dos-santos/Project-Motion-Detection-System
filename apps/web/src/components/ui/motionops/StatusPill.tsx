import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * StatusPill — uppercase pill with leading dot, used for system/camera/stream
 * health and similar single-word states. Pattern signature MotionOps.
 *
 * Tones:
 *  - healthy  → success (green)
 *  - degraded → warning (amber)
 *  - offline  → muted   (grey)
 *  - error    → critical (magenta)
 *  - active   → primary  (cyan)
 *
 * See docs/02-ux/02-design-system-functional.md "StatusPill"
 * and docs/02-ux/06-visual-direction-inspiration.md §5.5.
 */
export type StatusTone =
  | 'healthy'
  | 'degraded'
  | 'offline'
  | 'error'
  | 'active';

const TONE_CLASS: Record<StatusTone, string> = {
  healthy: 'mo-pill-success',
  degraded: 'mo-pill-warning',
  offline:
    'border border-[var(--mo-border-default)] text-[var(--mo-fg-muted)] bg-[rgba(255,255,255,0.04)]',
  error: 'mo-pill-critical',
  active: 'mo-pill-primary',
};

const TONE_DOT: Record<StatusTone, string> = {
  healthy: 'bg-[var(--mo-accent-success)] shadow-[0_0_6px_var(--mo-accent-success)]',
  degraded: 'bg-[var(--mo-accent-warning)] shadow-[0_0_6px_var(--mo-accent-warning)]',
  offline: 'bg-[var(--mo-fg-muted)]',
  error:
    'bg-[var(--mo-accent-critical)] shadow-[0_0_6px_var(--mo-accent-critical)]',
  active:
    'bg-[var(--mo-accent-primary)] shadow-[0_0_6px_var(--mo-accent-primary)]',
};

export interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  tone: StatusTone;
  pulse?: boolean;
  showDot?: boolean;
}

export const StatusPill = forwardRef<HTMLSpanElement, StatusPillProps>(
  (
    { tone, pulse, showDot = true, className, children, ...props },
    ref,
  ) => (
    <span
      ref={ref}
      role="status"
      className={cn('mo-pill', TONE_CLASS[tone], className)}
      {...props}
    >
      {showDot && (
        <span
          aria-hidden
          className={cn(
            'inline-block h-1.5 w-1.5 rounded-full',
            TONE_DOT[tone],
            pulse && 'mo-heartbeat',
          )}
        />
      )}
      {children}
    </span>
  ),
);
StatusPill.displayName = 'StatusPill';
