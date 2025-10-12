import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'online' | 'offline' | 'degraded' | 'buffering' | 'paused' | 'healthy' | 'critical' | 'warning' | 'info' | 'reconnecting';
  label?: string;
  size?: 'sm' | 'md';
}

const dotColors: Record<string, string> = {
  online: 'bg-emerald-500',
  healthy: 'bg-emerald-500',
  offline: 'bg-red-500',
  critical: 'bg-red-500',
  degraded: 'bg-amber-500',
  warning: 'bg-amber-500',
  buffering: 'bg-blue-500',
  reconnecting: 'bg-blue-500',
  paused: 'bg-gray-500',
  info: 'bg-teal-500',
};

const textColors: Record<string, string> = {
  online: 'text-emerald-400',
  healthy: 'text-emerald-400',
  offline: 'text-red-400',
  critical: 'text-red-400',
  degraded: 'text-amber-400',
  warning: 'text-amber-400',
  buffering: 'text-blue-400',
  reconnecting: 'text-blue-400',
  paused: 'text-gray-400',
  info: 'text-teal-400',
};

export function StatusBadge({ status, label, size = 'sm' }: StatusBadgeProps) {
  const displayLabel = label || status.charAt(0).toUpperCase() + status.slice(1);
  return (
    <div className="inline-flex items-center gap-1.5">
      <div className={cn('rounded-full', dotColors[status], size === 'sm' ? 'h-1.5 w-1.5' : 'h-2 w-2')} />
      <span className={cn('font-medium capitalize', textColors[status], size === 'sm' ? 'text-[11px]' : 'text-xs')}>
        {displayLabel}
      </span>
    </div>
  );
}
