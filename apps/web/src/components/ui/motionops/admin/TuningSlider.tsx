'use client';

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  useState,
  type ChangeEvent,
} from 'react';
import { Info, RotateCcw, Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * TuningSlider — signature component for live admin tuning.
 *
 * Displays a label + current value, markers for min / recommended / max, a
 * cyan-accented range input, and Reset / Revert controls. The "initial" value
 * is captured on mount via a ref so that Revert always returns to the value
 * the user first saw when they opened the panel.
 *
 * Spec: docs/02-ux/02-design-system-functional.md "TuningSlider"
 * Tokens: --mo-accent-primary, --mo-bg-input, --mo-glow-primary-subtle
 *
 * This is a client component because it manages the initial-value ref and
 * dispatches onCommit on pointer release.
 */
export interface TuningSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit?: string;
  recommendedValue?: number;
  onChange: (next: number) => void;
  onCommit?: (final: number) => void;
  tooltip?: string;
  disabled?: boolean;
  className?: string;
}

export const TuningSlider = forwardRef<HTMLDivElement, TuningSliderProps>(
  (
    {
      label,
      value,
      min,
      max,
      step = 1,
      unit,
      recommendedValue,
      onChange,
      onCommit,
      tooltip,
      disabled,
      className,
    },
    ref,
  ) => {
    const initialValueRef = useRef<number>(value);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      // Capture the initial value on the first client render only.
      if (!mounted) {
        initialValueRef.current = value;
        setMounted(true);
      }
    }, [mounted, value]);

    const handleChange = useCallback(
      (e: ChangeEvent<HTMLInputElement>) => {
        const next = Number(e.target.value);
        if (!Number.isNaN(next)) onChange(next);
      },
      [onChange],
    );

    const handleCommit = useCallback(() => {
      onCommit?.(value);
    }, [onCommit, value]);

    const handleReset = useCallback(() => {
      const target = recommendedValue ?? min;
      onChange(target);
      onCommit?.(target);
    }, [min, onChange, onCommit, recommendedValue]);

    const handleRevert = useCallback(() => {
      const target = initialValueRef.current;
      onChange(target);
      onCommit?.(target);
    }, [onChange, onCommit]);

    const clamped = Math.min(Math.max(value, min), max);
    const fillPct = max === min ? 0 : ((clamped - min) / (max - min)) * 100;
    const recommendedPct =
      recommendedValue != null && max !== min
        ? ((recommendedValue - min) / (max - min)) * 100
        : null;

    return (
      <div
        ref={ref}
        className={cn(
          'flex flex-col gap-2',
          disabled && 'cursor-not-allowed opacity-50',
          className,
        )}
      >
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-[11px] font-medium uppercase tracking-[0.06em] text-[var(--mo-fg-secondary)]">
              {label}
            </label>
            {tooltip && (
              <span
                title={tooltip}
                aria-label={tooltip}
                className="inline-flex cursor-help text-[var(--mo-fg-muted)] transition-colors hover:text-[var(--mo-accent-primary)]"
              >
                <Info className="h-3 w-3" aria-hidden />
              </span>
            )}
          </div>
          <span className="font-mono text-[15px] font-semibold text-[var(--mo-accent-primary)]">
            {value}
            {unit && (
              <span className="ml-0.5 text-[11px] font-normal text-[var(--mo-fg-secondary)]">
                {unit}
              </span>
            )}
          </span>
        </div>

        <div className="relative h-[14px]">
          <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-between font-mono text-[9px] text-[var(--mo-fg-muted)]">
            <span>{min}</span>
            {recommendedValue != null && recommendedPct != null && (
              <span
                className="absolute -translate-x-1/2 text-[var(--mo-accent-primary)]"
                style={{ left: `${recommendedPct}%` }}
              >
                rec {recommendedValue}
              </span>
            )}
            <span>{max}</span>
          </div>
        </div>

        <div
          className="relative h-[4px] rounded-full bg-[var(--mo-bg-input)]"
          style={{
            boxShadow: 'inset 0 0 0 1px var(--mo-border-subtle)',
          }}
        >
          <div
            aria-hidden
            className="absolute left-0 top-0 h-full rounded-full bg-[var(--mo-accent-primary)]"
            style={{
              width: `${fillPct}%`,
              boxShadow: 'var(--mo-glow-primary-subtle)',
            }}
          />
          {recommendedPct != null && (
            <div
              aria-hidden
              className="absolute top-1/2 h-[10px] w-[2px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--mo-accent-primary)] opacity-70"
              style={{ left: `${recommendedPct}%` }}
            />
          )}
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={clamped}
            disabled={disabled}
            onChange={handleChange}
            onMouseUp={handleCommit}
            onTouchEnd={handleCommit}
            onKeyUp={handleCommit}
            onBlur={handleCommit}
            aria-label={label}
            className={cn(
              'absolute inset-0 h-full w-full cursor-pointer appearance-none bg-transparent',
              '[&::-webkit-slider-runnable-track]:h-[4px] [&::-webkit-slider-runnable-track]:bg-transparent',
              '[&::-moz-range-track]:h-[4px] [&::-moz-range-track]:bg-transparent',
              '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-[14px] [&::-webkit-slider-thumb]:w-[14px] [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[var(--mo-accent-primary)] [&::-webkit-slider-thumb]:shadow-[var(--mo-glow-primary-subtle)] [&::-webkit-slider-thumb]:border [&::-webkit-slider-thumb]:border-[var(--mo-bg-app)] [&::-webkit-slider-thumb]:transition-[box-shadow,transform] [&::-webkit-slider-thumb]:duration-150 hover:[&::-webkit-slider-thumb]:shadow-[var(--mo-glow-primary)]',
              '[&::-moz-range-thumb]:h-[14px] [&::-moz-range-thumb]:w-[14px] [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-[var(--mo-accent-primary)] [&::-moz-range-thumb]:border [&::-moz-range-thumb]:border-[var(--mo-bg-app)] [&::-moz-range-thumb]:shadow-[var(--mo-glow-primary-subtle)] [&::-moz-range-thumb]:transition-[box-shadow] [&::-moz-range-thumb]:duration-150 hover:[&::-moz-range-thumb]:shadow-[var(--mo-glow-primary)]',
              'disabled:cursor-not-allowed',
            )}
          />
        </div>

        <div className="mt-1 flex items-center justify-end gap-1.5">
          <button
            type="button"
            onClick={handleReset}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-[var(--mo-radius-xs)] border border-[var(--mo-border-subtle)] bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.04em] text-[var(--mo-fg-secondary)] transition-[border-color,color] hover:border-[var(--mo-border-accent)] hover:text-[var(--mo-accent-primary)] disabled:cursor-not-allowed"
          >
            <RotateCcw className="h-3 w-3" aria-hidden />
            Reset
          </button>
          <button
            type="button"
            onClick={handleRevert}
            disabled={disabled}
            className="inline-flex items-center gap-1 rounded-[var(--mo-radius-xs)] border border-[var(--mo-border-subtle)] bg-transparent px-2 py-1 font-mono text-[10px] uppercase tracking-[0.04em] text-[var(--mo-fg-secondary)] transition-[border-color,color] hover:border-[var(--mo-border-accent)] hover:text-[var(--mo-accent-primary)] disabled:cursor-not-allowed"
          >
            <Undo2 className="h-3 w-3" aria-hidden />
            Revert
          </button>
        </div>
      </div>
    );
  },
);
TuningSlider.displayName = 'TuningSlider';
