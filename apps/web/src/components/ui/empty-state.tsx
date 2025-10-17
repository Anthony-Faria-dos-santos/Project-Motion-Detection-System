import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: { label: string; onClick: () => void };
  className?: string;
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-dashed border-[hsl(var(--border))] bg-[hsl(var(--card))]/50 px-6 py-12 text-center', className)}>
      <Icon className="h-8 w-8 text-[hsl(var(--muted-foreground))]" />
      <h3 className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">{title}</h3>
      <p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{description}</p>
      {action && (
        <button
          onClick={action.onClick}
          className="mt-4 rounded-md bg-[hsl(var(--primary))] px-3 py-1.5 text-xs font-medium text-[hsl(var(--primary-foreground))] transition-colors hover:bg-[hsl(var(--primary))]/90"
        >
          {action.label}
        </button>
      )}
    </div>
  );
}
