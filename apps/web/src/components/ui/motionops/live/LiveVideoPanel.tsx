import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * LiveVideoPanel — the dark-sky video container used on the live monitoring
 * screen. Slot pattern: children are rendered inside a positioned, overflow-
 * clipped surface so overlays (VideoChromeTop, VideoChromeBottom,
 * KeyboardHints, etc.) can be layered absolutely on top of the video scene.
 *
 * Mirrors `.video-panel` from docs/02-ux/frontend-handoff/live-monitoring-mockup.html:
 *  - layered background (sky→ground linear + cyan radial glow)
 *  - 1px accent border
 *  - inset 1px highlight + subtle primary glow (default)
 *  - critical glow when activeEvent === true (something is happening)
 *
 * `min-height: 0` is critical when this panel sits inside a flex column that
 * must shrink — without it the panel fights its children for height.
 */
export interface LiveVideoPanelProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  /**
   * When true, swap the subtle primary glow for a critical magenta glow to
   * signal an active/alerting event. Default false.
   */
  activeEvent?: boolean;
}

const PANEL_BACKGROUND_IMAGE =
  'linear-gradient(180deg, rgba(16, 24, 48, 0.4) 0%, rgba(5, 8, 15, 0.9) 100%), ' +
  'radial-gradient(ellipse at 50% 30%, rgba(110, 231, 255, 0.08) 0%, transparent 60%)';

export const LiveVideoPanel = forwardRef<HTMLDivElement, LiveVideoPanelProps>(
  ({ children, activeEvent = false, className, style, ...props }, ref) => (
    <div
      ref={ref}
      className={cn(
        'relative flex-1 overflow-hidden',
        'border border-[var(--mo-border-accent)]',
        'rounded-[var(--mo-radius-lg)]',
        className,
      )}
      style={{
        minHeight: 0,
        backgroundColor: '#050709',
        backgroundImage: PANEL_BACKGROUND_IMAGE,
        boxShadow: activeEvent
          ? 'inset 0 0 0 1px rgba(255,255,255,0.02), var(--mo-glow-critical)'
          : 'inset 0 0 0 1px rgba(255,255,255,0.02), var(--mo-glow-primary-subtle)',
        ...style,
      }}
      {...props}
    >
      {children}
    </div>
  ),
);
LiveVideoPanel.displayName = 'LiveVideoPanel';
