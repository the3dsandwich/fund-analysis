import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import NavGraphThumb from '../components/NavGraphThumb';

describe('NavGraphThumb', () => {
  it('renders the thumbnail image', () => {
    render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
    const img = screen.getByAltText('NAV trend for X');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc');
    expect(img).toHaveClass('nav-graph-thumb');
  });

  it('does not render the modal initially', () => {
    render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('opens modal when thumbnail is clicked', () => {
    render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
    fireEvent.click(screen.getByAltText('NAV trend for X'));
    const dialog = screen.getByRole('dialog');
    expect(dialog).toBeInTheDocument();
    // Modal has its own larger image
    const imgs = screen.getAllByAltText('NAV trend for X');
    expect(imgs.length).toBe(2);
    expect(imgs[1]).toHaveClass('nav-graph-modal-image');
  });

  it('closes modal when backdrop is clicked', () => {
    render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
    fireEvent.click(screen.getByAltText('NAV trend for X'));
    fireEvent.click(screen.getByRole('dialog'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal when the magnified image itself is clicked (event bubbles to backdrop)', () => {
    render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
    fireEvent.click(screen.getByAltText('NAV trend for X'));
    const imgs = screen.getAllByAltText('NAV trend for X');
    fireEvent.click(imgs[1]);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('closes modal when Escape key is pressed', () => {
    render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
    fireEvent.click(screen.getByAltText('NAV trend for X'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('thumbnail click stops propagation so parent link does not navigate', () => {
    const parentClick = vi.fn();
    render(
      <a href="/somewhere" onClick={parentClick}>
        <NavGraphThumb base64="abc" alt="NAV trend for X" />
      </a>
    );
    fireEvent.click(screen.getByAltText('NAV trend for X'));
    expect(parentClick).not.toHaveBeenCalled();
  });
});
