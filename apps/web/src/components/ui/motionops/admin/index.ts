/**
 * MotionOps Admin signature components — batch 3.
 * Tuning + preset + rule + danger + config diff primitives consumed by the
 * Admin Console (Sprint FE-4) and any other admin-style surface (Settings,
 * Camera config wizard, etc).
 *
 * Spec source: docs/02-ux/02-design-system-functional.md (Controls section).
 *
 * Usage pattern:
 *   <PresetSelector presets={...} currentPresetId={...} onSelect={...} />
 *   <TuningSlider label="Confidence" value={conf} min={0} max={1} step={0.01} onChange={setConf} onCommit={save} />
 *   <RuleToggle name="Night Loitering" enabled={on} severity="warning" onToggle={setOn} />
 *   <DangerActionButton label="Reset all rules" onConfirm={reset} />
 *   <ConfigDiffPanel current={liveCfg} proposed={draftCfg} />
 */

export { TuningSlider } from './TuningSlider';
export type { TuningSliderProps } from './TuningSlider';

export { PresetSelector } from './PresetSelector';
export type {
  PresetSelectorProps,
  PresetSelectorItem,
} from './PresetSelector';

export { RuleToggle } from './RuleToggle';
export type { RuleToggleProps, RuleToggleSeverity } from './RuleToggle';

export { DangerActionButton } from './DangerActionButton';
export type { DangerActionButtonProps } from './DangerActionButton';

export { ConfigDiffPanel } from './ConfigDiffPanel';
export type { ConfigDiffPanelProps } from './ConfigDiffPanel';
