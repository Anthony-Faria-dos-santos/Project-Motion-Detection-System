import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoCard } from './MoCard';

/**
 * SystemPulseCard — ambient "the system is watching and is healthy" card.
 * Materializes Insight 1 from docs/02-ux/05-personas-and-journeys.md
 * (confidence is the primary currency for the Operator persona).
 *
 * Tones map to system status:
 *  - healthy  → success green pulse
 *  - degraded → warning amber pulse
 *  - error    → critical magenta pulse
 *
 * Spec: docs/02-ux/02-design-system-functional.md "SystemPulseCard"
 */
export type SystemPulseTone = 'healthy' | 'degraded' | 'error';

const TONE_PULSE_BG: Record<SystemPulseTone, string> = {
  healthy:
    'bg-[var(--mo-accent-success-soft)] border border-[var(--mo-border-success)] shadow-[var(--mo-glow-success)]',
  degraded:
    'bg-[var(--mo-accent-warning-soft)] border border-[rgba(249,177,58,0.35)] shadow-[var(--mo-glow-warning)]',
  error:
    'bg-[var(--mo-accent-critical-soft)] border border-[var(--mo-border-critical)] shadow-[var(--mo-glow-critical)]',
};

const TONE_DOT: Record<SystemPulseTone, string> = {
  healthy:
    'bg-[var(--mo-accent-success)] shadow-[0_0_8px_var(--mo-accent-success)]',
  degraded:
    'bg-[var(--mo-accent-warning)] shadow-[0_0_8px_var(--mo-accent-warning)]',
  error:
    'bg-[var(--mo-accent-critical)] shadow-[0_0_8px_var(--mo-accent-critical)]',
};

const TONE_LABEL_COLOR: Record<SystemPulseTone, string> = {
  healthy: 'text-[var(--mo-accent-success)]',
  degraded: 'text-[var(--mo-accent-warning)]',
  error: 'text-[var(--mo-accent-critical)]',
};

export interface SystemPulseCardProps extends HTMLAttributes<HTMLDivElement> {
  tone: SystemPulseTone;
  label: string;
  meta?: ReactNode;
}

export const SystemPulseCard = forwardRef<HTMLDivElement, SystemPulseCardProps>(
  ({ tone, label, meta, className, ...props }, ref) => (
    <MoCard
      ref={ref}
      className={cn('flex items-center gap-3 p-3', className)}
      {...props}
    >
      <div
        aria-hidden
        className={cn(
          'flex h-8 w-8 items-center justify-center rounded-full',
          TONE_PULSE_BG[tone],
        )}
      >
        <span
          className={cn('h-2 w-2 rounded-full mo-heartbeat', TONE_DOT[tone])}
        />
      </div>
      <div className="min-w-0 flex-1">
        <div className="text-[11px] uppercase tracking-[0.04em] text-[var(--mo-fg-muted)]">
          {label}
        </div>
        {meta && (
          <div
            className={cn(
              'font-mono text-[13px] font-semibold',
              TONE_LABEL_COLOR[tone],
            )}
          >
            {meta}
          </div>
        )}
      </div>
    </MoCard>
  ),
);
SystemPulseCard.displayName = 'SystemPulseCard';
