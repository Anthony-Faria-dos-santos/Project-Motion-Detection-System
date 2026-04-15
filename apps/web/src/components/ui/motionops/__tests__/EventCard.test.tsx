import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EventCard } from '../EventCard';

const baseProps = {
  type: 'Zone Intrusion',
  time: '12:34:56',
  meta: 'Cam Gate · conf 0.92',
};

describe('EventCard', () => {
  it('renders type, time and meta', () => {
    render(<EventCard severity="info" {...baseProps} />);
    expect(screen.getByText('Zone Intrusion')).toBeInTheDocument();
    expect(screen.getByText('12:34:56')).toBeInTheDocument();
    expect(screen.getByText('Cam Gate · conf 0.92')).toBeInTheDocument();
  });

  it('applies severity-specific color class to the type label', () => {
    const { rerender, container } = render(
      <EventCard severity="critical" {...baseProps} />,
    );
    expect(
      container.querySelector('.text-\\[var\\(--mo-accent-critical\\)\\]'),
    ).not.toBeNull();

    rerender(<EventCard severity="warning" {...baseProps} />);
    expect(
      container.querySelector('.text-\\[var\\(--mo-accent-warning\\)\\]'),
    ).not.toBeNull();
  });

  it('adds the critical glow shadow when severity is critical', () => {
    const { container } = render(
      <EventCard severity="critical" {...baseProps} />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.boxShadow).toBe('var(--mo-glow-critical)');
    expect(card.style.borderColor).toBe('var(--mo-border-critical)');
  });

  it('does NOT apply the critical glow on non-critical severities', () => {
    const { container } = render(
      <EventCard severity="info" {...baseProps} />,
    );
    const card = container.firstElementChild as HTMLElement;
    expect(card.style.boxShadow).toBe('');
  });

  it('fires onConfirm / onReject / onEscalate on the respective buttons', async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    const onReject = vi.fn();
    const onEscalate = vi.fn();
    render(
      <EventCard
        severity="info"
        {...baseProps}
        onConfirm={onConfirm}
        onReject={onReject}
        onEscalate={onEscalate}
      />,
    );
    await user.click(screen.getByRole('button', { name: /Confirm/i }));
    await user.click(screen.getByRole('button', { name: /False/i }));
    await user.click(screen.getByRole('button', { name: /Escalate/i }));
    expect(onConfirm).toHaveBeenCalledOnce();
    expect(onReject).toHaveBeenCalledOnce();
    expect(onEscalate).toHaveBeenCalledOnce();
  });
});
