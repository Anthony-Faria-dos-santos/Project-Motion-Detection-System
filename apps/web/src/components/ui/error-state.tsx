import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ErrorStateProps {
  title?: string;
  message: string;
  retry?: () => void;
  className?: string;
}

export function ErrorState({ title = 'Something went wrong', message, retry, className }: ErrorStateProps) {
  return (
    <div className={cn('flex flex-col items-center justify-center rounded-lg border border-red-500/20 bg-red-500/5 px-6 py-12 text-center', className)}>
      <AlertTriangle className="h-8 w-8 text-red-400" />
      <h3 className="mt-3 text-sm font-medium text-[hsl(var(--foreground))]">{title}</h3>
      <p className="mt-1 text-xs text-red-300/80">{message}</p>
      {retry && (
        <button
          onClick={retry}
          className="mt-4 rounded-md border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-300 transition-colors hover:bg-red-500/10"
        >
          Retry
        </button>
      )}
    </div>
  );
}
