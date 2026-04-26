import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { MoCard } from './MoCard';

/**
 * EmptyStatePanel — generic "nothing here yet" surface that explains what is
 * missing and what to do next. Centered, generous padding, optional leading
 * glyph, optional CTA and optional docs link.
 *
 * Spec: docs/02-ux/02-design-system-functional.md "EmptyStatePanel" fiche
 * Fields: title, explanation (description), next action, optional doc link.
 *
 * Composition: MoCard surface + flex column items-center text-center.
 * Tokens exclusively via CSS variables / globals utility classes.
 */
export interface EmptyStatePanelProps extends HTMLAttributes<HTMLDivElement> {
  title: string;
  description: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  docsLink?: string;
  className?: string;
}

export const EmptyStatePanel = forwardRef<HTMLDivElement, EmptyStatePanelProps>(
  ({ title, description, action, icon, docsLink, className, ...props }, ref) => (
    <MoCard
      ref={ref}
      className={cn(
        'flex flex-col items-center gap-3 p-8 text-center',
        className,
      )}
      {...props}
    >
      {icon && (
        <div
          aria-hidden
          className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--mo-bg-input)] text-[var(--mo-fg-secondary)] border border-[var(--mo-border-subtle)]"
        >
          {icon}
        </div>
      )}

      <h3 className="font-display text-xl font-semibold text-[var(--mo-fg-primary)]">
        {title}
      </h3>

      <div className="max-w-md text-sm text-[var(--mo-fg-muted)]">
        {description}
      </div>

      {action && <div className="mt-1">{action}</div>}

      {docsLink && (
        <a
          href={docsLink}
          target="_blank"
          rel="noreferrer noopener"
          className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-[var(--mo-accent-primary)] hover:underline"
        >
          Read the docs
          <svg
            aria-hidden
            viewBox="0 0 16 16"
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 3h7v7" />
            <path d="M13 3 6.5 9.5" />
            <path d="M11 11v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h2" />
          </svg>
        </a>
      )}
    </MoCard>
  ),
);
EmptyStatePanel.displayName = 'EmptyStatePanel';
