import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { DangerActionButton } from '../DangerActionButton';

// userEvent interacts with real timers internally; this component's 4 s
// auto-disarm is easier to test with fireEvent + fake timers.

describe('DangerActionButton', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('shows the label in idle state and aria-pressed=false', () => {
    render(<DangerActionButton label="Delete" onConfirm={() => {}} />);
    const btn = screen.getByRole('button', { name: /Delete/i });
    expect(btn).toHaveAttribute('aria-pressed', 'false');
  });

  it('arms on first click and swaps to confirmLabel with aria-pressed=true', () => {
    render(
      <DangerActionButton label="Delete camera" confirmLabel="Confirm delete" onConfirm={() => {}} />,
    );
    fireEvent.click(screen.getByRole('button'));
    const btn = screen.getByRole('button', { name: /Confirm delete/i });
    expect(btn).toHaveAttribute('aria-pressed', 'true');
  });

  it('fires onConfirm on the second click within the timeout window', () => {
    const onConfirm = vi.fn();
    render(<DangerActionButton label="Delete" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button'));
    fireEvent.click(screen.getByRole('button'));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
  });

  it('auto-disarms after 4 seconds without confirmation', () => {
    const onConfirm = vi.fn();
    render(<DangerActionButton label="Delete" onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'true');
    act(() => {
      vi.advanceTimersByTime(4100);
    });
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    expect(onConfirm).not.toHaveBeenCalled();
  });

  it('does nothing when disabled', () => {
    const onConfirm = vi.fn();
    render(<DangerActionButton label="Delete" disabled onConfirm={onConfirm} />);
    fireEvent.click(screen.getByRole('button'));
    expect(screen.getByRole('button')).toHaveAttribute('aria-pressed', 'false');
    expect(onConfirm).not.toHaveBeenCalled();
  });
});
