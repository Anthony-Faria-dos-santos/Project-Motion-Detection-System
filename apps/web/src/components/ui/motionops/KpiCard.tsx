import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoCard } from './MoCard';

/**
 * KpiCard — big number on a card surface, the visual signature of MotionOps.
 * Big number must be ≥24px (we use --mo-text-display=48px by default, can
 * be reduced to 22-32px in tight grids via the `compact` prop).
 *
 * Spec: docs/02-ux/02-design-system-functional.md "KpiCard"
 * Pattern: docs/02-ux/06-visual-direction-inspiration.md §5.1
 *
 * Tone changes the big-number color (default = primary cyan).
 * Use `warning` / `critical` for KPIs that need attention.
 */
export type KpiTone = 'primary' | 'success' | 'warning' | 'critical';

const TONE_NUMBER_COLOR: Record<KpiTone, string> = {
  primary: 'text-[var(--mo-accent-primary)]',
  success: 'text-[var(--mo-accent-success)]',
  warning: 'text-[var(--mo-accent-warning)]',
  critical: 'text-[var(--mo-accent-critical)]',
};

export interface KpiCardProps extends HTMLAttributes<HTMLDivElement> {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  trend?: ReactNode;
  trendDirection?: 'up' | 'down' | 'neutral';
  freshness?: ReactNode;
  tone?: KpiTone;
  compact?: boolean;
  icon?: ReactNode;
}

export const KpiCard = forwardRef<HTMLDivElement, KpiCardProps>(
  (
    {
      label,
      value,
      unit,
      trend,
      trendDirection = 'neutral',
      freshness,
      tone = 'primary',
      compact,
      icon,
      className,
      ...props
    },
    ref,
  ) => (
    <MoCard
      ref={ref}
      interactive
      className={cn('flex flex-col gap-1 p-4', className)}
      {...props}
    >
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-medium uppercase tracking-[0.06em] text-[var(--mo-fg-muted)]">
          {label}
        </span>
        {icon && <span className="ml-auto text-[var(--mo-fg-muted)]">{icon}</span>}
      </div>

      <div
        className={cn(
          'font-display font-bold leading-none -tracking-[0.02em]',
          compact ? 'text-[28px]' : 'text-[44px]',
          TONE_NUMBER_COLOR[tone],
        )}
      >
        {value}
        {unit && (
          <span className="ml-1 text-[14px] font-normal text-[var(--mo-fg-secondary)]">
            {unit}
          </span>
        )}
      </div>

      {trend && (
        <div
          className={cn(
            'font-mono text-[11px]',
            trendDirection === 'up' && 'text-[var(--mo-accent-success)]',
            trendDirection === 'down' && 'text-[var(--mo-accent-critical)]',
            trendDirection === 'neutral' && 'text-[var(--mo-fg-muted)]',
          )}
        >
          {trend}
        </div>
      )}

      {freshness && (
        <div className="mt-1 font-mono text-[10px] text-[var(--mo-fg-muted)]">
          {freshness}
        </div>
      )}
    </MoCard>
  ),
);
KpiCard.displayName = 'KpiCard';
