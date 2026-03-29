import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import StarButton from '../components/StarButton';

describe('StarButton', () => {
  it('shows filled star when starred', () => {
    render(<StarButton starred onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('\u2605');
  });

  it('shows empty star when not starred', () => {
    render(<StarButton starred={false} onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveTextContent('\u2606');
  });

  it('calls onClick when clicked', () => {
    const handleClick = vi.fn();
    render(<StarButton starred={false} onClick={handleClick} />);
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
  });

  it('stops event propagation', () => {
    const parentClick = vi.fn();
    const handleClick = vi.fn();
    render(
      <div onClick={parentClick}>
        <StarButton starred={false} onClick={handleClick} />
      </div>
    );
    fireEvent.click(screen.getByRole('button'));
    expect(handleClick).toHaveBeenCalledOnce();
    expect(parentClick).not.toHaveBeenCalled();
  });

  it('has starred class when starred', () => {
    render(<StarButton starred onClick={() => {}} />);
    expect(screen.getByRole('button')).toHaveClass('star-btn-active');
  });
});
