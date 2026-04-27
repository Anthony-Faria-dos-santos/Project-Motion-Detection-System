import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * MoCard — default surface card aligned with MotionOps visual direction.
 * Uses --mo-bg-surface + --mo-gradient-surface highlight + --mo-border-subtle
 * + --mo-radius-lg. See docs/02-ux/02-design-system-functional.md.
 *
 * For elevated surfaces (popovers, dropdowns), use `elevated` variant which
 * switches to --mo-bg-surface-elevated.
 *
 * For glassmorphism modals, use GlassModal instead — this card is solid
 * by design (operational surfaces stay solid; glass is reserved for layered UI).
 */
export interface MoCardProps extends HTMLAttributes<HTMLDivElement> {
  elevated?: boolean;
  interactive?: boolean;
}

export const MoCard = forwardRef<HTMLDivElement, MoCardProps>(
  ({ className, elevated, interactive, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'mo-card',
        elevated && 'bg-[var(--mo-bg-surface-elevated)]',
        interactive &&
          'cursor-pointer transition-[box-shadow,border-color] duration-200 hover:border-[var(--mo-border-accent)] hover:shadow-[var(--mo-glow-primary-subtle)]',
        className,
      )}
      {...props}
    />
  ),
);
MoCard.displayName = 'MoCard';
