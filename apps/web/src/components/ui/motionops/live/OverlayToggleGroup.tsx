import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * OverlayToggleGroup — row of small toggle buttons used inside a video chrome
 * to flip overlay layers on/off (e.g. "Zones", "Boxes", "Heatmap", "Labels").
 *
 * Mirrors `.overlay-toggle-group` + `.overlay-btn` / `.overlay-btn.on` from
 * docs/02-ux/frontend-handoff/live-monitoring-mockup.html.
 *
 * Active-state representation: this component takes a `Set<string>` (not a
 * plain array) for the `active` prop. Two reasons:
 *   1. O(1) membership lookup while rendering N buttons
 *   2. Forces callers to use immutable Set updates, which pairs well with
 *      React's reference-equality rerender model
 * Callers holding an array can do `new Set(array)` at the call site.
 */
export interface OverlayToggleOption {
  id: string;
  label: string;
}

export interface OverlayToggleGroupProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'onToggle'> {
  options: OverlayToggleOption[];
  /** Set of currently active option ids. */
  active: Set<string>;
  onToggle: (id: string) => void;
}

export const OverlayToggleGroup = forwardRef<
  HTMLDivElement,
  OverlayToggleGroupProps
>(({ options, active, onToggle, className, ...props }, ref) => (
  <div
    ref={ref}
    role="group"
    aria-label="Video overlay toggles"
    className={cn('flex gap-1', className)}
    {...props}
  >
    {options.map((option) => {
      const isOn = active.has(option.id);
      return (
        <button
          key={option.id}
          type="button"
          aria-pressed={isOn}
          onClick={() => onToggle(option.id)}
          className={cn(
            'cursor-pointer px-3 py-[6px] text-[11px] font-medium',
            'rounded-[var(--mo-radius-sm)]',
            'transition-[background-color,border-color,color,box-shadow] duration-150',
            isOn
              ? 'border border-[var(--mo-border-accent)] bg-[var(--mo-accent-primary-soft)] text-[var(--mo-accent-primary)] shadow-[var(--mo-glow-primary-subtle)]'
              : 'border border-[var(--mo-border-subtle)] text-[var(--mo-fg-secondary)]',
          )}
          style={{
            backgroundColor: isOn
              ? 'var(--mo-accent-primary-soft)'
              : 'rgba(255, 255, 255, 0.05)',
            backdropFilter: 'var(--mo-blur-glass-light)',
            WebkitBackdropFilter: 'var(--mo-blur-glass-light)',
          }}
        >
          {option.label}
        </button>
      );
    })}
  </div>
));
OverlayToggleGroup.displayName = 'OverlayToggleGroup';
