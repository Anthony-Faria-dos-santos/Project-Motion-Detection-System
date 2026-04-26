import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * TimelinePlayhead — 2px cyan vertical cursor with a glowing 10px round dot
 * cap at the top. Reproduces `.playhead` and its `::before` cap from
 * `docs/02-ux/frontend-handoff/live-monitoring-mockup.html`.
 *
 * Absolute-positioned child of the track. `leftPercent` is applied inline so
 * it can animate smoothly on the parent's transitions.
 */
export interface TimelinePlayheadProps extends HTMLAttributes<HTMLDivElement> {
  leftPercent: number;
}

export const TimelinePlayhead = forwardRef<HTMLDivElement, TimelinePlayheadProps>(
  ({ leftPercent, className, style, ...props }, ref) => (
    <div
      ref={ref}
      aria-hidden
      className={cn(
        'pointer-events-none absolute top-0 bottom-0 z-[5] w-[2px]',
        'bg-[var(--mo-accent-primary)] shadow-[var(--mo-glow-primary)]',
        className,
      )}
      style={{ left: `${leftPercent}%`, ...style }}
      {...props}
    >
      <span
        className={cn(
          'absolute h-[10px] w-[10px] rounded-full',
          'bg-[var(--mo-accent-primary)] shadow-[var(--mo-glow-primary)]',
        )}
        style={{ top: '-3px', left: '-4px' }}
      />
    </div>
  ),
);
TimelinePlayhead.displayName = 'TimelinePlayhead';
