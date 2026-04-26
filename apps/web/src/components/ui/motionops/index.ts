/**
 * MotionOps signature components.
 * Implements the catalog defined in docs/02-ux/02-design-system-functional.md
 * using the canonical tokens from docs/02-ux/frontend-handoff/design-tokens.css
 * (mirrored into apps/web/src/app/globals.css).
 *
 * Always prefer these components over raw shadcn primitives for new MotionOps
 * surfaces. The legacy shadcn `--background`/`--primary` tokens still resolve
 * to MotionOps values for backward-compatibility, but new code should reach
 * for these wrappers so the visual signature stays coherent.
 */

export { MoCard, type MoCardProps } from './MoCard';
export {
  StatusPill,
  type StatusPillProps,
  type StatusTone,
} from './StatusPill';
export { KpiCard, type KpiCardProps, type KpiTone } from './KpiCard';
export {
  EventChip,
  type EventChipProps,
  type EventChipSeverity,
} from './EventChip';
export {
  SystemPulseCard,
  type SystemPulseCardProps,
  type SystemPulseTone,
} from './SystemPulseCard';
export {
  KeyboardHints,
  type KeyboardHint,
  type KeyboardHintsProps,
} from './KeyboardHints';
export { GlassModal, type GlassModalProps } from './GlassModal';

// Batch 2 — generic components
export { EmptyStatePanel } from './EmptyStatePanel';
export { EventCard } from './EventCard';

// Batch 2 — Live Monitoring signature components (video + SVG overlays + timeline)
export * from './live';

// Batch 3 — Admin signature components (tuning + preset + rule + danger + config diff)
export * from './admin';
