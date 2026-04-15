import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConfigDiffPanel } from '../ConfigDiffPanel';

describe('ConfigDiffPanel', () => {
  it('classifies unchanged / modified / added / removed keys correctly', () => {
    render(
      <ConfigDiffPanel
        current={{ keep: 'a', change: 1, remove: 'old' }}
        proposed={{ keep: 'a', change: 2, add: 'new' }}
      />,
    );

    // Unchanged: label with spaces prefix
    expect(screen.getByText(/keep:/)).toBeInTheDocument();
    // Modified: ~ prefix + old value + arrow + new value
    expect(screen.getByText(/change:/)).toBeInTheDocument();
    expect(screen.getByText(/→/)).toBeInTheDocument();
    // Removed
    expect(screen.getByText(/remove:/)).toBeInTheDocument();
    // Added
    expect(screen.getByText(/add:/)).toBeInTheDocument();
  });

  it('treats two deep-equal objects as unchanged via JSON.stringify fallback', () => {
    render(
      <ConfigDiffPanel
        current={{ nested: { a: 1, b: 2 } }}
        proposed={{ nested: { a: 1, b: 2 } }}
      />,
    );
    const footer = screen.getByText(/0 added/);
    expect(footer).toBeInTheDocument();
    expect(screen.getByText(/0 removed/)).toBeInTheDocument();
    expect(screen.getByText(/0 modified/)).toBeInTheDocument();
  });

  it('reports counts in the footer summary', () => {
    render(
      <ConfigDiffPanel
        current={{ a: 1, b: 2 }}
        proposed={{ a: 1, c: 3 }}
      />,
    );
    expect(screen.getByText('1 added')).toBeInTheDocument();
    expect(screen.getByText('1 removed')).toBeInTheDocument();
    expect(screen.getByText('0 modified')).toBeInTheDocument();
  });

  it('renders custom title when provided', () => {
    render(
      <ConfigDiffPanel
        current={{}}
        proposed={{}}
        title="Pending rule changes"
      />,
    );
    expect(screen.getByText('Pending rule changes')).toBeInTheDocument();
  });

  it('pluralises the key count correctly', () => {
    const { rerender } = render(
      <ConfigDiffPanel current={{ a: 1 }} proposed={{ a: 1 }} />,
    );
    expect(screen.getByText('1 key')).toBeInTheDocument();

    rerender(<ConfigDiffPanel current={{ a: 1, b: 2 }} proposed={{ a: 1, b: 2 }} />);
    expect(screen.getByText('2 keys')).toBeInTheDocument();
  });
});
