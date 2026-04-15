import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StatusPill } from '../StatusPill';

describe('StatusPill', () => {
  it('renders children inside a status role', () => {
    render(<StatusPill tone="healthy">Online</StatusPill>);
    const pill = screen.getByRole('status');
    expect(pill).toBeInTheDocument();
    expect(pill).toHaveTextContent('Online');
  });

  it('applies the tone class token for each tone', () => {
    const tones = [
      { tone: 'healthy' as const, cls: 'mo-pill-success' },
      { tone: 'degraded' as const, cls: 'mo-pill-warning' },
      { tone: 'error' as const, cls: 'mo-pill-critical' },
      { tone: 'active' as const, cls: 'mo-pill-primary' },
    ];
    for (const { tone, cls } of tones) {
      const { unmount } = render(<StatusPill tone={tone}>x</StatusPill>);
      expect(screen.getByRole('status')).toHaveClass(cls);
      unmount();
    }
  });

  it('renders the leading dot by default and hides it with showDot=false', () => {
    const { rerender, container } = render(
      <StatusPill tone="healthy">Online</StatusPill>,
    );
    expect(container.querySelector('span[aria-hidden]')).not.toBeNull();

    rerender(
      <StatusPill tone="healthy" showDot={false}>
        Online
      </StatusPill>,
    );
    expect(container.querySelector('span[aria-hidden]')).toBeNull();
  });

  it('adds mo-heartbeat to the dot when pulse is true', () => {
    const { container } = render(
      <StatusPill tone="active" pulse>
        Live
      </StatusPill>,
    );
    const dot = container.querySelector('span[aria-hidden]');
    expect(dot).toHaveClass('mo-heartbeat');
  });

  it('forwards extra className onto the pill element', () => {
    render(
      <StatusPill tone="healthy" className="custom-cls">
        x
      </StatusPill>,
    );
    expect(screen.getByRole('status')).toHaveClass('custom-cls');
  });
});
