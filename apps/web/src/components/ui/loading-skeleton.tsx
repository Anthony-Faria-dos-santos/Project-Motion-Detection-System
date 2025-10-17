import { cn } from '@/lib/utils';

export function Skeleton({ className }: { className?: string }) {
  return (
    <div className={cn('animate-pulse rounded-md bg-[hsl(var(--muted))]', className)} />
  );
}

export function KpiCardSkeleton() {
  return (
    <div className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-4">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="mt-2 h-7 w-16" />
      <Skeleton className="mt-2 h-4 w-24" />
    </div>
  );
}

export function TableRowSkeleton() {
  return (
    <div className="flex items-center gap-4 border-b border-[hsl(var(--border))] px-4 py-3">
      <Skeleton className="h-8 w-8 rounded" />
      <div className="flex-1 space-y-1.5">
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-2.5 w-32" />
      </div>
      <Skeleton className="h-5 w-14 rounded-full" />
    </div>
  );
}
