import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * VideoChromeBottom — bottom overlay strip sitting inside a LiveVideoPanel.
 * Pure layout wrapper: caller composes the actual content, typically an
 * `<OverlayToggleGroup />` followed by a `<FrameMetaStrip />`.
 *
 * Mirrors `.video-chrome-bottom` from
 * docs/02-ux/frontend-handoff/live-monitoring-mockup.html.
 *
 * The background gradient (transparent → black 80%) is applied inline because
 * Tailwind's arbitrary-value syntax gets noisy for multi-stop rgba gradients.
 */
export interface VideoChromeBottomProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

export const VideoChromeBottom = forwardRef<
  HTMLDivElement,
  VideoChromeBottomProps
>(({ children, className, style, ...props }, ref) => (
  <div
    ref={ref}
    className={cn(
      'absolute bottom-0 left-0 right-0 z-[2]',
      'flex items-center gap-3',
      'px-[var(--mo-space-4)] py-[var(--mo-space-3)]',
      className,
    )}
    style={{
      backgroundImage:
        'linear-gradient(0deg, rgba(0, 0, 0, 0.8) 0%, transparent 100%)',
      ...style,
    }}
    {...props}
  >
    {children}
  </div>
));
VideoChromeBottom.displayName = 'VideoChromeBottom';
