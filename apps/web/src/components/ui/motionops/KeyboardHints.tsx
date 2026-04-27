import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * KeyboardHints — small overlay (typically bottom-right of a panel) listing
 * available shortcuts in the current context. Encodes the keyboard-first
 * principle for the Operator persona (Insight 2 from
 * docs/02-ux/05-personas-and-journeys.md).
 *
 * Constraints:
 *  - 3-6 hints max — discipline forces prioritization
 *  - mono font, muted color, low visual weight
 *  - position absolute by default, override via className for portals
 *
 * Spec: docs/02-ux/02-design-system-functional.md "KeyboardHints"
 */
export interface KeyboardHint {
  keys: string | string[];
  label: string;
}

export interface KeyboardHintsProps extends HTMLAttributes<HTMLDivElement> {
  hints: KeyboardHint[];
  /**
   * If true, position absolute bottom-right of nearest positioned ancestor.
   * Default true. Set false to render inline.
   */
  floating?: boolean;
}

function Kbd({ children }: { children: string }) {
  return (
    <kbd className="mr-1 inline-flex items-center rounded-[4px] border border-[var(--mo-border-default)] bg-[rgba(255,255,255,0.05)] px-1.5 py-px font-mono text-[10px] font-medium text-[var(--mo-fg-secondary)]">
      {children}
    </kbd>
  );
}

export const KeyboardHints = forwardRef<HTMLDivElement, KeyboardHintsProps>(
  ({ hints, floating = true, className, ...props }, ref) => {
    if (hints.length === 0) return null;
    if (hints.length > 6) {
      // eslint-disable-next-line no-console
      console.warn(
        '[KeyboardHints] passed more than 6 hints; consider trimming for legibility.',
      );
    }
    return (
      <div
        ref={ref}
        role="group"
        aria-label="Keyboard shortcuts"
        className={cn(
          'flex gap-2 font-mono text-[10px] text-[var(--mo-fg-muted)]',
          floating && 'pointer-events-none absolute bottom-16 right-4 z-[2]',
          className,
        )}
        {...props}
      >
        {hints.map((hint, idx) => {
          const keys = Array.isArray(hint.keys) ? hint.keys : [hint.keys];
          return (
            <span key={idx} className="inline-flex items-center">
              {keys.map((k) => (
                <Kbd key={k}>{k}</Kbd>
              ))}
              <span className="ml-px">{hint.label}</span>
            </span>
          );
        })}
      </div>
    );
  },
);
KeyboardHints.displayName = 'KeyboardHints';
