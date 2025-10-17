import { cn } from '@/lib/utils';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
  action?: React.ReactNode;
}

export function Card({ title, children, className, action }: CardProps) {
  return (
    <div className={cn('rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))]', className)}>
      {title && (
        <div className="flex items-center justify-between border-b border-[hsl(var(--border))] px-4 py-2.5">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))]">
            {title}
          </h3>
          {action}
        </div>
      )}
      <div className="p-4">{children}</div>
    </div>
  );
}
