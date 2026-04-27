import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * FrameMetaStrip — mono strip of inference metadata (FPS, latency, model,
 * confidence, etc.) shown in the bottom-right of a live video chrome.
 *
 * Mirrors `.video-meta-right` + `.video-meta-right span b` from
 * docs/02-ux/frontend-handoff/live-monitoring-mockup.html.
 *
 * The `margin-left: auto` default is intentional: when this strip is placed
 * inside a `<VideoChromeBottom />` next to an `<OverlayToggleGroup />`, it
 * naturally pushes to the right edge without the caller having to reach for
 * flex helpers.
 */
export interface FrameMetaItem {
  label: string;
  value: ReactNode;
}

export interface FrameMetaStripProps extends HTMLAttributes<HTMLDivElement> {
  items: FrameMetaItem[];
}

export const FrameMetaStrip = forwardRef<HTMLDivElement, FrameMetaStripProps>(
  ({ items, className, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'ml-auto flex gap-4',
        'font-mono text-[11px] leading-none text-[var(--mo-fg-secondary)]',
        className,
      )}
      {...props}
    >
      {items.map((item, idx) => (
        <span key={`${item.label}-${idx}`}>
          {item.label}{' '}
          <b className="font-medium text-[var(--mo-accent-primary)]">
            {item.value}
          </b>
        </span>
      ))}
    </div>
  ),
);
FrameMetaStrip.displayName = 'FrameMetaStrip';
