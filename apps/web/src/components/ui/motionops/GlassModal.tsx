'use client';

import {
  useEffect,
  useRef,
  type HTMLAttributes,
  type ReactNode,
} from 'react';
import { createPortal } from 'react-dom';
import { cn } from '@/lib/utils';

/**
 * GlassModal — floating modal with glassmorphism effect. Pattern signature
 * issued from the Sign In video reference (docs/02-ux/06-visual-direction-inspiration.md
 * §1.4 + §6 + spec in 02-design-system-functional.md "GlassModal").
 *
 * Layered: backdrop overlay → optional iridescent gradient blob → glass surface.
 * Reserved for modals only — operational surfaces (lists, tables) stay solid.
 *
 * Behavior:
 *  - Closes on Escape and on backdrop click
 *  - Locks body scroll while open
 *  - Renders via createPortal into document.body
 *  - Focus management is intentionally minimal (use Radix Dialog if you need
 *    full focus trap + ARIA — this is a styled primitive, not a dialog system)
 */
export interface GlassModalProps extends HTMLAttributes<HTMLDivElement> {
  open: boolean;
  onClose: () => void;
  /** Optional iridescent gradient blob behind the glass. Default true. */
  withBlob?: boolean;
  /** Maximum width — Tailwind class. Default `max-w-md`. */
  maxWidth?: string;
  children: ReactNode;
}

export function GlassModal({
  open,
  onClose,
  withBlob = true,
  maxWidth = 'max-w-md',
  className,
  children,
  ...props
}: GlassModalProps) {
  const surfaceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', handleKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-[400] flex items-center justify-center"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      {/* backdrop */}
      <div
        aria-hidden
        className="absolute inset-0 bg-[var(--mo-bg-overlay)] backdrop-blur-[2px]"
      />

      {/* iridescent blob behind glass */}
      {withBlob && (
        <div
          aria-hidden
          className="pointer-events-none absolute h-[420px] w-[420px] rounded-full opacity-40 blur-[80px]"
          style={{ background: 'var(--mo-gradient-iris)' }}
        />
      )}

      {/* glass surface */}
      <div
        ref={surfaceRef}
        className={cn(
          'relative mx-4 w-full mo-glass rounded-[var(--mo-radius-xl)] p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]',
          maxWidth,
          className,
        )}
        {...props}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
