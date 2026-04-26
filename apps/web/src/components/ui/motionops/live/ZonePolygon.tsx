import { cn } from '@/lib/utils';

/**
 * ZonePolygon — dashed polygon used to highlight a spatial rule zone
 * (restricted area, safe area, counting line boundary…) over the Live
 * Monitoring canvas.
 *
 * Reference mockup pattern:
 *
 *     <polygon points="340,420 500,420 540,540 320,540"
 *              fill="rgba(255,77,143,0.08)" stroke="#FF4D8F"
 *              stroke-opacity="0.4" stroke-dasharray="4 3" />
 *
 * The component renders inside a parent <svg> and returns a <g> containing
 * the polygon and an optional label.
 *
 * Color strategy
 * --------------
 * Stroke uses `var(--mo-accent-*)` with a `strokeOpacity` attribute, which
 * composes correctly in SVG without ever needing alpha-aware color parsing.
 * Fill, however, needs a low 0.08 alpha which cannot be modulated from a
 * CSS variable reliably in SVG — so we inline the literal rgba() values,
 * kept in sync with `apps/web/src/app/globals.css`.
 */

export type ZoneSeverity = 'critical' | 'warning' | 'info' | 'success';

// Literal RGB triples used to build alpha-modulated fill().
// Sources (must stay in sync with globals.css):
//   --mo-accent-critical = #FF4D8F → 255, 77, 143
//   --mo-accent-warning  = #F9B13A → 249, 177, 58
//   --mo-accent-primary  = #6EE7FF → 110, 231, 255
//   --mo-accent-success  = #52F0A8 → 82, 240, 168
const RGB_TRIPLE: Record<ZoneSeverity, string> = {
  critical: '255, 77, 143',
  warning: '249, 177, 58',
  info: '110, 231, 255',
  success: '82, 240, 168',
};

const STROKE_VAR: Record<ZoneSeverity, string> = {
  critical: 'var(--mo-accent-critical)',
  warning: 'var(--mo-accent-warning)',
  info: 'var(--mo-accent-primary)',
  success: 'var(--mo-accent-success)',
};

export interface ZonePolygonPoint {
  x: number;
  y: number;
}

export interface ZonePolygonProps {
  /** Ordered list of vertices. Minimum 3. */
  points: ZonePolygonPoint[];
  /** Optional label rendered centered on the polygon. */
  label?: string;
  /** Severity drives fill + stroke color. Defaults to `'critical'`. */
  severity?: ZoneSeverity;
  /** Explicit label position; if omitted we compute the centroid. */
  labelPosition?: { x: number; y: number };
  /** Fill alpha in [0, 1]. Defaults to 0.08 (matches mockup). */
  fillOpacity?: number;
  /** Stroke alpha in [0, 1]. Defaults to 0.4 (matches mockup). */
  strokeOpacity?: number;
  /** Forwarded to the root <g>. */
  className?: string;
}

function computeCentroid(points: ZonePolygonPoint[]): { x: number; y: number } {
  const sum = points.reduce(
    (acc, p) => ({ x: acc.x + p.x, y: acc.y + p.y }),
    { x: 0, y: 0 },
  );
  return { x: sum.x / points.length, y: sum.y / points.length };
}

export function ZonePolygon({
  points,
  label,
  severity = 'critical',
  labelPosition,
  fillOpacity = 0.08,
  strokeOpacity = 0.4,
  className,
}: ZonePolygonProps) {
  if (points.length < 3) return null;

  const pointsAttr = points.map((p) => `${p.x},${p.y}`).join(' ');
  const stroke = STROKE_VAR[severity];
  const fill = `rgba(${RGB_TRIPLE[severity]}, ${fillOpacity})`;

  const labelPos = labelPosition ?? computeCentroid(points);

  return (
    <g className={cn(className)}>
      <polygon
        points={pointsAttr}
        fill={fill}
        stroke={stroke}
        strokeWidth={1.5}
        strokeOpacity={strokeOpacity}
        strokeDasharray="4 3"
      />
      {label ? (
        <text
          x={labelPos.x}
          y={labelPos.y}
          fontFamily="Geist Mono, monospace"
          fontSize={9}
          fontWeight={600}
          fill={stroke}
          textAnchor="middle"
          dominantBaseline="middle"
        >
          {label}
        </text>
      ) : null}
    </g>
  );
}
