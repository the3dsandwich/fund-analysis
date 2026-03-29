import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import LoadingState from '../components/LoadingState';

describe('LoadingState', () => {
  it('shows loading message by default', () => {
    render(<LoadingState />);
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('shows custom loading message', () => {
    render(<LoadingState message="Loading data for 2026-03-28..." />);
    expect(screen.getByText('Loading data for 2026-03-28...')).toBeInTheDocument();
  });

  it('shows error message when error prop is provided', () => {
    render(<LoadingState error="Failed to load data." />);
    expect(screen.getByText('Failed to load data.')).toBeInTheDocument();
  });

  it('shows error styling when error prop is provided', () => {
    const { container } = render(<LoadingState error="Something went wrong" />);
    expect(container.firstChild).toHaveClass('error-state');
  });
});
