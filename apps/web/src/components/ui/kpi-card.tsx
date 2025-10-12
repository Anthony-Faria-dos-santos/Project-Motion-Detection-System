import { cn } from '@/lib/utils';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface KpiCardProps {
  label: string;
  value: string | number;
  unit?: string;
  delta?: { value: number; label: string };
  status?: 'info' | 'success' | 'warning' | 'critical' | 'neutral';
}

const statusColors = {
  info: 'text-teal-400',
  success: 'text-emerald-400',
  warning: 'text-amber-400',
  critical: 'text-red-400',
  neutral: 'text-[hsl(var(--muted-foreground))]',
};

const statusBg = {
  info: 'bg-teal-500/10',
  success: 'bg-emerald-500/10',
  warning: 'bg-amber-500/10',
  critical: 'bg-red-500/10',
  neutral: 'bg-[hsl(var(--muted))]/50',
};

export function KpiCard({ label, value, unit, delta, status = 'neutral' }: KpiCardProps) {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <p className="text-xs font-medium uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
        {label}
      </p>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span className={cn('text-2xl font-semibold tabular-nums', statusColors[status])}>
          {value}
        </span>
        {unit && (
          <span className="text-xs text-[hsl(var(--muted-foreground))]">{unit}</span>
        )}
      </div>
      {delta && (
        <div className={cn('mt-2 inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[11px] font-medium', statusBg[status])}>
          {delta.value > 0 ? (
            <TrendingUp className="h-3 w-3" />
          ) : delta.value < 0 ? (
            <TrendingDown className="h-3 w-3" />
          ) : (
            <Minus className="h-3 w-3" />
          )}
          <span>{delta.label}</span>
        </div>
      )}
    </div>
  );
}
