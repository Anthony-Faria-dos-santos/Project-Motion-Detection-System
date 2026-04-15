import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { KpiCard } from '../KpiCard';

describe('KpiCard', () => {
  it('renders label + value + optional unit', () => {
    render(<KpiCard label="Active cameras" value={12} unit="on" />);
    expect(screen.getByText('Active cameras')).toBeInTheDocument();
    expect(screen.getByText('12')).toBeInTheDocument();
    expect(screen.getByText('on')).toBeInTheDocument();
  });

  it('defaults to primary tone number color class', () => {
    const { container } = render(<KpiCard label="X" value={1} />);
    const number = container.querySelector('.font-display');
    expect(number).toHaveClass('text-[var(--mo-accent-primary)]');
  });

  it('applies the correct tone color class', () => {
    const { container: c1 } = render(<KpiCard label="a" value={1} tone="critical" />);
    expect(c1.querySelector('.font-display')).toHaveClass('text-[var(--mo-accent-critical)]');
    const { container: c2 } = render(<KpiCard label="b" value={2} tone="warning" />);
    expect(c2.querySelector('.font-display')).toHaveClass('text-[var(--mo-accent-warning)]');
  });

  it('uses the compact font size class when compact is true', () => {
    const { container } = render(<KpiCard label="x" value={1} compact />);
    expect(container.querySelector('.font-display')).toHaveClass('text-[28px]');
  });

  it('renders trend with the direction-specific color', () => {
    const { container: up } = render(
      <KpiCard label="x" value={1} trend="+12%" trendDirection="up" />,
    );
    expect(up.querySelector('.font-mono')).toHaveClass('text-[var(--mo-accent-success)]');

    const { container: down } = render(
      <KpiCard label="x" value={1} trend="-3%" trendDirection="down" />,
    );
    expect(down.querySelector('.font-mono')).toHaveClass('text-[var(--mo-accent-critical)]');
  });

  it('renders icon slot when provided', () => {
    render(
      <KpiCard label="x" value={1} icon={<svg data-testid="icon" />} />,
    );
    expect(screen.getByTestId('icon')).toBeInTheDocument();
  });
});
