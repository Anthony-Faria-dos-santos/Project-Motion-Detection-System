import { cn } from '@/lib/utils';
import type { EventSeverity } from '@motionops/types';

const severityConfig: Record<EventSeverity, { bg: string; text: string; label: string }> = {
  info: { bg: 'bg-teal-500/15', text: 'text-teal-400', label: 'Info' },
  low: { bg: 'bg-blue-500/15', text: 'text-blue-400', label: 'Low' },
  medium: { bg: 'bg-amber-500/15', text: 'text-amber-400', label: 'Medium' },
  high: { bg: 'bg-orange-500/15', text: 'text-orange-400', label: 'High' },
  critical: { bg: 'bg-red-500/15', text: 'text-red-400', label: 'Critical' },
};

export function SeverityBadge({ severity }: { severity: EventSeverity }) {
  const config = severityConfig[severity];
  return (
    <span className={cn('inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide', config.bg, config.text)}>
      {config.label}
    </span>
  );
}
