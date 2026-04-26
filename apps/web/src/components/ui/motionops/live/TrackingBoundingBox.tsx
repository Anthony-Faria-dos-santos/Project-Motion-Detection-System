import { cn } from '@/lib/utils';

/**
 * TrackingBoundingBox — SVG bounding box with a label tag, used inside the
 * Live Monitoring canvas to annotate a tracked object (person, vehicle…).
 *
 * This component MUST render inside a parent <svg>. It returns a <g>, not a
 * standalone <svg>, so coordinates are expressed in the parent's viewBox
 * units.
 *
 * Reference mockup: docs/02-ux/frontend-handoff/live-monitoring-mockup.html
 * — see the `<g transform="translate(420, 380)">` (critical person) and
 * `<g transform="translate(860, 450)">` (info vehicle) patterns.
 *
 * Severity color strategy
 * -----------------------
 * Solid strokes use `var(--mo-accent-*)` directly in the SVG attribute, which
 * works in modern browsers. The label rect, however, needs alpha-channel
 * modulation and CSS variables do NOT compose cleanly with alpha in SVG
 * `fill`, so we inline the literal rgba() values instead. The hex sources
 * kept in sync with `apps/web/src/app/globals.css` are documented below.
 */

export type TrackingSeverity = 'critical' | 'warning' | 'info' | 'success';

// Literal fallbacks used for rgba() alpha modulation on the label tag.
// Kept in sync with:
//   --mo-accent-critical = #FF4D8F → rgb(255, 77, 143)
//   --mo-accent-warning  = #F9B13A → rgb(249, 177, 58)
//   --mo-accent-primary  = #6EE7FF → rgb(110, 231, 255)
//   --mo-accent-success  = #52F0A8 → rgb(82, 240, 168)
const LABEL_RGBA: Record<TrackingSeverity, string> = {
  critical: 'rgba(255, 77, 143, 0.9)',
  warning: 'rgba(249, 177, 58, 0.9)',
  info: 'rgba(110, 231, 255, 0.9)',
  success: 'rgba(82, 240, 168, 0.9)',
};

const STROKE_VAR: Record<TrackingSeverity, string> = {
  critical: 'var(--mo-accent-critical)',
  warning: 'var(--mo-accent-warning)',
  info: 'var(--mo-accent-primary)',
  success: 'var(--mo-accent-success)',
};

export interface TrackingBoundingBoxProps {
  /** Top-left X coordinate in parent SVG viewBox units. */
  x: number;
  /** Top-left Y coordinate in parent SVG viewBox units. */
  y: number;
  /** Box width in parent SVG viewBox units. */
  width: number;
  /** Box height in parent SVG viewBox units. */
  height: number;
  /** Human-readable label — will be uppercased in the tag. */
  label: string;
  /** Detection confidence in [0, 1]. Rendered as `0.96`. */
  confidence: number;
  /** Severity drives the stroke & label background color. */
  severity: TrackingSeverity;
  /** Optional tracker id, rendered as ` · ID#042` after the label. */
  trackId?: string | number;
  /** Forwarded to the root <g>. */
  className?: string;
  /** SVG filter id used for the glow, defaults to `cyanGlow`. */
  filterId?: string;
}

export function TrackingBoundingBox({
  x,
  y,
  width,
  height,
  label,
  confidence,
  severity,
  trackId,
  className,
  filterId = 'cyanGlow',
}: TrackingBoundingBoxProps) {
  const stroke = STROKE_VAR[severity];
  const labelFill = LABEL_RGBA[severity];

  const trackSuffix = trackId !== undefined ? ` · ID#${trackId}` : '';
  const labelText = `${label.toUpperCase()}${trackSuffix} · ${confidence.toFixed(2)}`;

  // Rough advance-width estimate for a 10px Geist Mono glyph (~6.2px/char),
  // plus 8px of horizontal padding so the tag hugs the text.
  const labelWidth = Math.max(32, Math.round(labelText.length * 6.2 + 8));

  return (
    <g transform={`translate(${x}, ${y})`} className={cn(className)}>
      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="none"
        stroke={stroke}
        strokeWidth={2}
        filter={`url(#${filterId})`}
      />
      <rect
        x={-1}
        y={-20}
        width={labelWidth}
        height={16}
        rx={2}
        fill={labelFill}
      />
      <text
        x={4}
        y={-8}
        fontFamily="Geist Mono, monospace"
        fontSize={10}
        fontWeight={700}
        fill="#0A0B0F"
      >
        {labelText}
      </text>
    </g>
  );
}
