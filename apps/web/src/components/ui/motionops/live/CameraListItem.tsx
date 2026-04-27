import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * CameraListItem — single row in the sidebar camera list of the live-monitoring
 * view. Reproduces `.camera-item` / `.camera-status` / `.camera-label` /
 * `.camera-fps` from `docs/02-ux/frontend-handoff/live-monitoring-mockup.html`.
 *
 * Visual grammar:
 *  - 6px round status dot (glow on `live` / `alert`)
 *  - label in `fg-secondary`, promoted to `accent-primary` when active
 *  - trailing fps readout in font-mono 10px muted
 *  - hover background `bg-input`, active soft-cyan fill + inset cyan border
 */
export type CameraStatus = 'live' | 'alert' | 'offline';

const DOT_VARIANT: Record<CameraStatus, string> = {
  live: 'bg-[var(--mo-accent-success)] shadow-[0_0_6px_var(--mo-accent-success)]',
  alert:
    'bg-[var(--mo-accent-critical)] shadow-[0_0_6px_var(--mo-accent-critical)]',
  offline: 'bg-[var(--mo-fg-disabled)]',
};

export interface CameraListItemProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'onClick'> {
  name: string;
  status: CameraStatus;
  fps?: number | null;
  active?: boolean;
  onClick?: () => void;
}

export const CameraListItem = forwardRef<HTMLButtonElement, CameraListItemProps>(
  (
    { name, status, fps, active = false, onClick, className, ...props },
    ref,
  ) => {
    const fpsLabel = fps == null ? '—' : `${fps}`;

    return (
      <button
        ref={ref}
        type="button"
        onClick={onClick}
        aria-pressed={active}
        className={cn(
          'flex w-full items-center gap-2 text-left text-[12px]',
          'px-[var(--mo-space-3)] py-[var(--mo-space-2)]',
          'rounded-[var(--mo-radius-sm)] cursor-pointer',
          'transition-[background-color,box-shadow,color] duration-150',
          'hover:bg-[var(--mo-bg-input)]',
          active &&
            'bg-[var(--mo-accent-primary-soft)] shadow-[inset_0_0_0_1px_var(--mo-border-accent)]',
          className,
        )}
        {...props}
      >
        <span
          aria-hidden
          className={cn(
            'h-[6px] w-[6px] shrink-0 rounded-full',
            DOT_VARIANT[status],
          )}
        />
        <span
          className={cn(
            'flex-1 truncate',
            active
              ? 'text-[var(--mo-accent-primary)]'
              : 'text-[var(--mo-fg-secondary)]',
          )}
        >
          {name}
        </span>
        <span className="font-mono text-[10px] text-[var(--mo-fg-muted)]">
          {fpsLabel}
        </span>
      </button>
    );
  },
);
CameraListItem.displayName = 'CameraListItem';
