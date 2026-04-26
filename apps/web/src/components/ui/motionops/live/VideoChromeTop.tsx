import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '@/lib/utils';

/**
 * VideoChromeTop — top overlay strip sitting inside a LiveVideoPanel.
 * Shows the camera title, its RTSP URL (mono), and a pulsing "LIVE · REC"
 * indicator pushed to the right.
 *
 * Mirrors `.video-chrome-top`, `.cam-title`, `.cam-meta-mono`, `.rec-indicator`,
 * and `.rec-dot` from docs/02-ux/frontend-handoff/live-monitoring-mockup.html.
 *
 * The background gradient (black 70% → transparent) is applied inline because
 * Tailwind's arbitrary-value syntax gets noisy for multi-stop rgba gradients
 * and we want the literal spec from the mockup.
 */
export interface VideoChromeTopProps extends HTMLAttributes<HTMLDivElement> {
  camTitle: string;
  rtspUrl?: string;
  /**
   * Show the pulsing LIVE · REC pill. Default true.
   * Set false for VOD / paused playback contexts.
   */
  showRecording?: boolean;
}

export const VideoChromeTop = forwardRef<HTMLDivElement, VideoChromeTopProps>(
  (
    { camTitle, rtspUrl, showRecording = true, className, style, ...props },
    ref,
  ) => (
    <div
      ref={ref}
      className={cn(
        'absolute left-0 right-0 top-0 z-[2]',
        'flex items-center gap-3',
        'px-[var(--mo-space-4)] py-[var(--mo-space-3)]',
        className,
      )}
      style={{
        backgroundImage:
          'linear-gradient(180deg, rgba(0, 0, 0, 0.7) 0%, transparent 100%)',
        ...style,
      }}
      {...props}
    >
      <span className="text-[14px] font-semibold leading-none text-[var(--mo-fg-primary)]">
        {camTitle}
      </span>
      {rtspUrl ? (
        <span className="font-mono text-[11px] leading-none text-[var(--mo-fg-muted)]">
          {rtspUrl}
        </span>
      ) : null}
      {showRecording ? (
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-[6px]',
            'rounded-[var(--mo-radius-full)]',
            'border border-[var(--mo-border-critical)]',
            'px-[10px] py-[4px]',
            'text-[11px] font-semibold uppercase tracking-[0.06em]',
            'text-[var(--mo-accent-critical)]',
          )}
          style={{ backgroundColor: 'rgba(255, 77, 143, 0.15)' }}
          aria-label="Recording live"
        >
          <span
            aria-hidden
            className="mo-heartbeat block h-[6px] w-[6px] rounded-full"
            style={{
              backgroundColor: 'var(--mo-accent-critical)',
              boxShadow: 'var(--mo-glow-critical)',
            }}
          />
          LIVE · REC
        </span>
      ) : null}
    </div>
  ),
);
VideoChromeTop.displayName = 'VideoChromeTop';
