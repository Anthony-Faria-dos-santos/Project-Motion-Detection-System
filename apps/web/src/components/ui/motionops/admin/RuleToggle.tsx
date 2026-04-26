import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { MoCard } from '../MoCard';

/**
 * RuleToggle — a switch-style row used to enable/disable an admin rule.
 *
 * Wrapped in a MoCard `elevated` surface. Optional severity dot hints at the
 * impact of the rule (critical/warning/info/success). The switch is a
 * native button with `role="switch"` + `aria-checked` for accessibility.
 *
 * Spec: docs/02-ux/02-design-system-functional.md "RuleToggle"
 */
export type RuleToggleSeverity = 'critical' | 'warning' | 'info' | 'success';

const DOT_VARIANT: Record<RuleToggleSeverity, string> = {
  critical:
    'bg-[var(--mo-accent-critical)] shadow-[0_0_6px_var(--mo-accent-critical)]',
  warning:
    'bg-[var(--mo-accent-warning)] shadow-[0_0_6px_var(--mo-accent-warning)]',
  info: 'bg-[var(--mo-accent-primary)]',
  success:
    'bg-[var(--mo-accent-success)] shadow-[0_0_6px_var(--mo-accent-success)]',
};

export interface RuleToggleProps {
  name: string;
  description?: string;
  enabled: boolean;
  severity?: RuleToggleSeverity;
  onToggle: (next: boolean) => void;
  disabled?: boolean;
  className?: string;
}

export const RuleToggle = forwardRef<HTMLDivElement, RuleToggleProps>(
  (
    { name, description, enabled, severity, onToggle, disabled, className },
    ref,
  ) => {
    return (
      <MoCard
        ref={ref}
        elevated
        className={cn(
          'flex items-center justify-between gap-3 px-3 py-2.5',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <div className="flex min-w-0 items-start gap-2">
          {severity && (
            <span
              aria-hidden
              className={cn(
                'mt-[6px] inline-block h-1.5 w-1.5 shrink-0 rounded-full',
                DOT_VARIANT[severity],
              )}
            />
          )}
          <div className="flex min-w-0 flex-col">
            <span className="truncate text-[12px] font-medium text-[var(--mo-fg-primary)]">
              {name}
            </span>
            {description && (
              <span className="mt-0.5 text-[10px] leading-snug text-[var(--mo-fg-muted)]">
                {description}
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          aria-label={name}
          disabled={disabled}
          onClick={() => onToggle(!enabled)}
          className={cn(
            'relative inline-flex h-4 w-7 shrink-0 items-center rounded-full border transition-[background-color,border-color,box-shadow] duration-200',
            enabled
              ? 'border-[var(--mo-border-accent)] bg-[var(--mo-accent-primary)] shadow-[var(--mo-glow-primary-subtle)]'
              : 'border-[var(--mo-border-default)] bg-[var(--mo-bg-input)]',
            disabled && 'cursor-not-allowed',
          )}
        >
          <span
            aria-hidden
            className={cn(
              'inline-block h-3 w-3 rounded-full bg-[var(--mo-fg-primary)] shadow-[0_1px_2px_rgba(0,0,0,0.6)] transition-transform duration-200',
              enabled
                ? 'translate-x-[14px] bg-[var(--mo-bg-app)]'
                : 'translate-x-[2px]',
            )}
          />
        </button>
      </MoCard>
    );
  },
);
RuleToggle.displayName = 'RuleToggle';
