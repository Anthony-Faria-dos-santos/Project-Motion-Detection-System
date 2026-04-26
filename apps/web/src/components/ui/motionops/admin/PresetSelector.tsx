import type { FC } from 'react';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusPill } from '../StatusPill';

/**
 * PresetSelector — lists configuration presets and lets the admin activate
 * one. The caller owns the selection state; this component only emits
 * `onSelect(id)` and (optionally) `onCreateNew()`.
 *
 * Spec: docs/02-ux/02-design-system-functional.md "PresetSelector"
 */
export interface PresetSelectorItem {
  id: string;
  name: string;
  description?: string;
  isCurrent?: boolean;
}

export interface PresetSelectorProps {
  presets: PresetSelectorItem[];
  currentPresetId?: string | null;
  onSelect: (id: string) => void;
  onCreateNew?: () => void;
  className?: string;
}

export const PresetSelector: FC<PresetSelectorProps> = ({
  presets,
  currentPresetId,
  onSelect,
  onCreateNew,
  className,
}) => {
  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <ul className="flex flex-col gap-1" role="listbox" aria-label="Presets">
        {presets.map((preset) => {
          const isActive = preset.isCurrent || preset.id === currentPresetId;
          return (
            <li key={preset.id}>
              <button
                type="button"
                role="option"
                aria-pressed={isActive}
                aria-selected={isActive}
                onClick={() => onSelect(preset.id)}
                className={cn(
                  'group flex w-full items-center justify-between gap-3 rounded-[var(--mo-radius-sm)] border px-3 py-2 text-left transition-[background-color,border-color,box-shadow] duration-150',
                  isActive
                    ? 'border-[var(--mo-border-accent)] bg-[var(--mo-accent-primary-soft)] shadow-[var(--mo-glow-primary-subtle)]'
                    : 'border-[var(--mo-border-subtle)] bg-[var(--mo-bg-input)] hover:border-[var(--mo-border-default)] hover:bg-[rgba(255,255,255,0.04)]',
                )}
              >
                <span className="flex min-w-0 flex-col">
                  <span
                    className={cn(
                      'truncate text-[12px] font-medium',
                      isActive
                        ? 'text-[var(--mo-accent-primary)]'
                        : 'text-[var(--mo-fg-primary)]',
                    )}
                  >
                    {preset.name}
                  </span>
                  {preset.description && (
                    <span className="mt-0.5 truncate text-[10px] text-[var(--mo-fg-muted)]">
                      {preset.description}
                    </span>
                  )}
                </span>
                {isActive && (
                  <StatusPill tone="active" className="shrink-0">
                    Current
                  </StatusPill>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {onCreateNew && (
        <button
          type="button"
          onClick={onCreateNew}
          className="inline-flex items-center justify-center gap-1.5 rounded-[var(--mo-radius-sm)] border border-dashed border-[var(--mo-border-default)] bg-transparent px-3 py-2 font-mono text-[11px] uppercase tracking-[0.04em] text-[var(--mo-fg-secondary)] transition-[border-color,color] hover:border-[var(--mo-border-accent)] hover:text-[var(--mo-accent-primary)]"
        >
          <Plus className="h-3.5 w-3.5" aria-hidden />
          New preset
        </button>
      )}
    </div>
  );
};
PresetSelector.displayName = 'PresetSelector';
