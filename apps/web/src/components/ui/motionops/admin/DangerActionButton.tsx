'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type FC,
  type ReactNode,
} from 'react';
import { AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * DangerActionButton — two-click confirm pattern for destructive actions.
 *
 * First click "arms" the button: it swaps the label to `confirmLabel`, pulses
 * a critical glow via `mo-heartbeat`, and waits up to 4 seconds for a second
 * click. A second click within the window fires `onConfirm` and resets. No
 * second click resets silently after the timeout.
 *
 * Spec: docs/02-ux/02-design-system-functional.md "DangerActionButton"
 */
const CONFIRM_TIMEOUT_MS = 4000;

export interface DangerActionButtonProps {
  label: string;
  confirmLabel?: string;
  onConfirm: () => void;
  icon?: ReactNode;
  disabled?: boolean;
  className?: string;
}

export const DangerActionButton: FC<DangerActionButtonProps> = ({
  label,
  confirmLabel = 'Click again to confirm',
  onConfirm,
  icon,
  disabled,
  className,
}) => {
  const [armed, setArmed] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimer = useCallback(() => {
    if (timerRef.current != null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => clearTimer();
  }, [clearTimer]);

  const handleClick = useCallback(() => {
    if (disabled) return;
    if (!armed) {
      setArmed(true);
      clearTimer();
      timerRef.current = setTimeout(() => {
        setArmed(false);
        timerRef.current = null;
      }, CONFIRM_TIMEOUT_MS);
      return;
    }
    clearTimer();
    setArmed(false);
    onConfirm();
  }, [armed, clearTimer, disabled, onConfirm]);

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled}
      aria-pressed={armed}
      className={cn(
        'inline-flex items-center gap-2 rounded-[var(--mo-radius-sm)] border px-3 py-2 font-mono text-[11px] uppercase tracking-[0.06em] transition-[background-color,border-color,box-shadow,color] duration-200',
        'bg-[var(--mo-accent-critical-soft)] text-[var(--mo-accent-critical)] border-[var(--mo-border-critical)]',
        'hover:shadow-[var(--mo-glow-critical)]',
        armed && 'mo-heartbeat shadow-[var(--mo-glow-critical)] border-[var(--mo-accent-critical)]',
        disabled && 'cursor-not-allowed opacity-50',
        className,
      )}
    >
      <span aria-hidden className="inline-flex">
        {icon ?? <AlertTriangle className="h-3.5 w-3.5" />}
      </span>
      <span>{armed ? confirmLabel : label}</span>
    </button>
  );
};
DangerActionButton.displayName = 'DangerActionButton';
