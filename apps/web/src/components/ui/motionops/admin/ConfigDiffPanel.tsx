import { forwardRef } from 'react';
import { cn } from '@/lib/utils';
import { MoCard } from '../MoCard';

/**
 * ConfigDiffPanel — renders a top-level diff between two configuration
 * snapshots (current vs proposed). Intended as a review surface before an
 * admin commits a change. This is a UI helper: the comparison is shallow
 * (top-level keys) and uses JSON.stringify for non-primitive equality.
 *
 * Spec: docs/02-ux/02-design-system-functional.md "ConfigDiffPanel"
 */
export interface ConfigDiffPanelProps {
  current: Record<string, unknown>;
  proposed: Record<string, unknown>;
  title?: string;
  className?: string;
}

type DiffKind = 'unchanged' | 'modified' | 'added' | 'removed';

interface DiffRow {
  key: string;
  kind: DiffKind;
  current?: unknown;
  proposed?: unknown;
}

function formatValue(value: unknown): string {
  if (value == null) return String(value);
  if (typeof value === 'string') return value;
  if (typeof value === 'number' || typeof value === 'boolean')
    return String(value);
  try {
    return JSON.stringify(value);
  } catch {
    return '[unserializable]';
  }
}

function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a == null || b == null) return false;
  const ta = typeof a;
  const tb = typeof b;
  if (ta !== tb) return false;
  if (ta === 'number' || ta === 'string' || ta === 'boolean') return false;
  try {
    return JSON.stringify(a) === JSON.stringify(b);
  } catch {
    return false;
  }
}

function buildDiff(
  current: Record<string, unknown>,
  proposed: Record<string, unknown>,
): DiffRow[] {
  const keys = Array.from(
    new Set([...Object.keys(current), ...Object.keys(proposed)]),
  ).sort();
  return keys.map<DiffRow>((key) => {
    const inCurrent = Object.prototype.hasOwnProperty.call(current, key);
    const inProposed = Object.prototype.hasOwnProperty.call(proposed, key);
    if (inCurrent && inProposed) {
      if (isEqual(current[key], proposed[key])) {
        return {
          key,
          kind: 'unchanged',
          current: current[key],
          proposed: proposed[key],
        };
      }
      return {
        key,
        kind: 'modified',
        current: current[key],
        proposed: proposed[key],
      };
    }
    if (inProposed) {
      return { key, kind: 'added', proposed: proposed[key] };
    }
    return { key, kind: 'removed', current: current[key] };
  });
}

export const ConfigDiffPanel = forwardRef<HTMLDivElement, ConfigDiffPanelProps>(
  (
    { current, proposed, title = 'Configuration changes', className },
    ref,
  ) => {
    const rows = buildDiff(current, proposed);
    const added = rows.filter((r) => r.kind === 'added').length;
    const removed = rows.filter((r) => r.kind === 'removed').length;
    const modified = rows.filter((r) => r.kind === 'modified').length;

    return (
      <MoCard ref={ref} className={cn('flex flex-col gap-3 p-4', className)}>
        <header className="flex items-center justify-between gap-2">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--mo-fg-secondary)]">
            {title}
          </h3>
          <span className="font-mono text-[10px] text-[var(--mo-fg-muted)]">
            {rows.length} key{rows.length === 1 ? '' : 's'}
          </span>
        </header>

        <ul className="flex flex-col gap-0.5">
          {rows.map((row) => {
            if (row.kind === 'unchanged') {
              return (
                <li
                  key={row.key}
                  className="font-mono text-[11px] text-[var(--mo-fg-muted)]"
                >
                  <span className="opacity-60">  </span>
                  {row.key}: {formatValue(row.current)}
                </li>
              );
            }
            if (row.kind === 'modified') {
              return (
                <li
                  key={row.key}
                  className="font-mono text-[11px] text-[var(--mo-fg-primary)]"
                >
                  <span className="text-[var(--mo-fg-muted)]">~ </span>
                  {row.key}:{' '}
                  <del className="text-[var(--mo-fg-muted)]">
                    {formatValue(row.current)}
                  </del>
                  <span className="mx-1 text-[var(--mo-fg-muted)]">→</span>
                  <strong className="font-semibold text-[var(--mo-accent-primary)]">
                    {formatValue(row.proposed)}
                  </strong>
                </li>
              );
            }
            if (row.kind === 'added') {
              return (
                <li
                  key={row.key}
                  className="font-mono text-[11px] text-[var(--mo-fg-primary)]"
                >
                  <span className="text-[var(--mo-accent-success)]">+ </span>
                  {row.key}:{' '}
                  <strong className="font-semibold text-[var(--mo-accent-success)]">
                    {formatValue(row.proposed)}
                  </strong>
                </li>
              );
            }
            return (
              <li
                key={row.key}
                className="font-mono text-[11px] text-[var(--mo-fg-primary)]"
              >
                <span className="text-[var(--mo-accent-critical)]">- </span>
                {row.key}:{' '}
                <del className="text-[var(--mo-accent-critical)]">
                  {formatValue(row.current)}
                </del>
              </li>
            );
          })}
        </ul>

        <footer className="flex items-center gap-3 border-t border-[var(--mo-border-subtle)] pt-2 font-mono text-[10px] text-[var(--mo-fg-muted)]">
          <span className="text-[var(--mo-accent-success)]">{added} added</span>
          <span className="text-[var(--mo-accent-critical)]">
            {removed} removed
          </span>
          <span className="text-[var(--mo-accent-primary)]">
            {modified} modified
          </span>
        </footer>
      </MoCard>
    );
  },
);
ConfigDiffPanel.displayName = 'ConfigDiffPanel';
