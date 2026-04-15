import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TuningSlider } from '../TuningSlider';

describe('TuningSlider', () => {
  it('renders label + current value + unit', () => {
    render(
      <TuningSlider label="Motion threshold" value={42} min={0} max={100} unit="%" onChange={() => {}} />,
    );
    expect(screen.getByText('Motion threshold')).toBeInTheDocument();
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByText('%')).toBeInTheDocument();
  });

  it('renders the recommended marker when provided', () => {
    render(
      <TuningSlider
        label="conf"
        value={30}
        min={0}
        max={100}
        recommendedValue={50}
        onChange={() => {}}
      />,
    );
    expect(screen.getByText(/rec 50/)).toBeInTheDocument();
  });

  it('calls onChange when the slider moves', () => {
    const onChange = vi.fn();
    render(
      <TuningSlider label="x" value={10} min={0} max={100} onChange={onChange} />,
    );
    const slider = screen.getByRole('slider', { name: 'x' });
    fireEvent.change(slider, { target: { value: '55' } });
    expect(onChange).toHaveBeenCalledWith(55);
  });

  it('calls onCommit on mouse up / blur', () => {
    const onCommit = vi.fn();
    render(
      <TuningSlider label="x" value={10} min={0} max={100} onChange={() => {}} onCommit={onCommit} />,
    );
    const slider = screen.getByRole('slider', { name: 'x' });
    fireEvent.mouseUp(slider);
    expect(onCommit).toHaveBeenCalledWith(10);
  });

  it('Reset button dispatches recommendedValue when provided', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const onCommit = vi.fn();
    render(
      <TuningSlider
        label="x"
        value={10}
        min={0}
        max={100}
        recommendedValue={60}
        onChange={onChange}
        onCommit={onCommit}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Reset/i }));
    expect(onChange).toHaveBeenCalledWith(60);
    expect(onCommit).toHaveBeenCalledWith(60);
  });

  it('Reset button falls back to min when no recommendedValue', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(
      <TuningSlider label="x" value={10} min={5} max={100} onChange={onChange} />,
    );
    await user.click(screen.getByRole('button', { name: /Reset/i }));
    expect(onChange).toHaveBeenCalledWith(5);
  });

  it('Revert button restores the initial value seen on mount', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <TuningSlider label="x" value={25} min={0} max={100} onChange={onChange} />,
    );
    // User nudges value up to 80 (parent re-renders with the new controlled value)
    rerender(<TuningSlider label="x" value={80} min={0} max={100} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Revert/i }));
    expect(onChange).toHaveBeenLastCalledWith(25);
  });

  it('disables the range and action buttons when disabled', () => {
    render(
      <TuningSlider label="x" value={10} min={0} max={100} disabled onChange={() => {}} />,
    );
    expect(screen.getByRole('slider', { name: 'x' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Reset/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Revert/i })).toBeDisabled();
  });
});
