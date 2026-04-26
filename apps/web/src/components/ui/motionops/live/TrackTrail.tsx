import { cn } from '@/lib/utils';

/**
 * TrackTrail — dashed motion-trail path connecting a series of track points.
 * Used behind a TrackingBoundingBox to suggest recent movement, mirroring the
 * mockup pattern:
 *
 *     <path d="M 200 600 Q 380 500 420 400"
 *           stroke="#FF4D8F" stroke-dasharray="6 4" ... />
 *
 * The component MUST render inside a parent <svg>; it returns a single
 * <path> element (no wrapping <g>) unless a className is provided, in which
 * case we wrap for className forwarding.
 *
 * Path-construction strategy
 * --------------------------
 * With 2 points we emit a straight line (`M x0 y0 L x1 y1`). With 3+ points
 * we use quadratic Béziers between midpoints: the first segment is a `M` to
 * point 0, then for every intermediate point P[i] we emit
 * `Q P[i] ((P[i] + P[i+1]) / 2)` and finally a `L` to the last point. This
 * produces a smooth trail without introducing new dependencies and degrades
 * gracefully when only 2 points are provided.
 */

export type TrackTrailSeverity = 'critical' | 'warning' | 'info' | 'success';

const STROKE_VAR: Record<TrackTrailSeverity, string> = {
  critical: 'var(--mo-accent-critical)',
  warning: 'var(--mo-accent-warning)',
  info: 'var(--mo-accent-primary)',
  success: 'var(--mo-accent-success)',
};

export interface TrackTrailPoint {
  x: number;
  y: number;
}

export interface TrackTrailProps {
  /** Ordered list of track points. Minimum 2. */
  points: TrackTrailPoint[];
  /** Severity drives the stroke color. */
  severity: TrackTrailSeverity;
  /** Stroke opacity in [0, 1]. Defaults to 0.5. */
  opacity?: number;
  /** Stroke width in SVG user units. Defaults to 2. */
  strokeWidth?: number;
  /** Stroke dash pattern. Defaults to `'6 4'` (matches mockup). */
  dashArray?: string;
  /** Forwarded to the wrapping element. */
  className?: string;
}

function buildPathD(points: TrackTrailPoint[]): string {
  if (points.length < 2) return '';

  const first = points[0]!;
  if (points.length === 2) {
    const last = points[1]!;
    return `M ${first.x} ${first.y} L ${last.x} ${last.y}`;
  }

  // 3+ points: quadratic smoothing between midpoints.
  let d = `M ${first.x} ${first.y}`;
  for (let i = 1; i < points.length - 1; i++) {
    const ctrl = points[i]!;
    const next = points[i + 1]!;
    const midX = (ctrl.x + next.x) / 2;
    const midY = (ctrl.y + next.y) / 2;
    d += ` Q ${ctrl.x} ${ctrl.y} ${midX} ${midY}`;
  }
  const last = points[points.length - 1]!;
  d += ` L ${last.x} ${last.y}`;
  return d;
}

export function TrackTrail({
  points,
  severity,
  opacity = 0.5,
  strokeWidth = 2,
  dashArray = '6 4',
  className,
}: TrackTrailProps) {
  if (points.length < 2) return null;

  const d = buildPathD(points);
  const stroke = STROKE_VAR[severity];

  return (
    <path
      className={cn(className)}
      d={d}
      fill="none"
      stroke={stroke}
      strokeOpacity={opacity}
      strokeWidth={strokeWidth}
      strokeDasharray={dashArray}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  );
}
