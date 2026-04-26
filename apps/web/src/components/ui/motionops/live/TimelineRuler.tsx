import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * TimelineRuler — horizontal time-tick row absolutely pinned to the top of the
 * timeline track. Reproduces `.time-ruler` + `.time-tick` from
 * `docs/02-ux/frontend-handoff/live-monitoring-mockup.html`.
 *
 * Absolute-positioned child of the track: `top: 0, left: 0, right: 0`,
 * height 22px, subtle bottom border, faint white film background. Each tick
 * is flex-1 with a right divider; the LAST tick has no right border.
 */
export interface TimelineRulerProps extends HTMLAttributes<HTMLDivElement> {
  ticks: string[];
}

export const TimelineRuler = forwardRef<HTMLDivElement, TimelineRulerProps>(
  ({ ticks, className, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'absolute left-0 right-0 top-0 flex h-[22px]',
        'border-b border-[var(--mo-border-subtle)]',
        'font-mono text-[10px] text-[var(--mo-fg-muted)]',
        'bg-[rgba(255,255,255,0.02)]',
        className,
      )}
      {...props}
    >
      {ticks.map((tick, index) => {
        const isLast = index === ticks.length - 1;
        return (
          <div
            key={`${tick}-${index}`}
            className={cn(
              'flex-1 px-[6px] py-[4px]',
              !isLast && 'border-r border-[var(--mo-border-subtle)]',
            )}
          >
            {tick}
          </div>
        );
      })}
    </div>
  ),
);
TimelineRuler.displayName = 'TimelineRuler';
