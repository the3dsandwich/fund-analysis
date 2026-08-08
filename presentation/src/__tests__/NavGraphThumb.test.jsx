import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

  describe('closing (animated — delayed unmount via is-closing)', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
    });

    it('marks the dialog is-closing immediately, before it is removed', () => {
      render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
      fireEvent.click(screen.getByAltText('NAV trend for X'));
      fireEvent.click(screen.getByRole('dialog'));
      expect(screen.getByRole('dialog')).toHaveClass('is-closing');
    });

    it('closes modal when backdrop is clicked', () => {
      render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
      fireEvent.click(screen.getByAltText('NAV trend for X'));
      fireEvent.click(screen.getByRole('dialog'));
      act(() => vi.advanceTimersByTime(200));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes modal when the magnified image itself is clicked (event bubbles to backdrop)', () => {
      render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
      fireEvent.click(screen.getByAltText('NAV trend for X'));
      const imgs = screen.getAllByAltText('NAV trend for X');
      fireEvent.click(imgs[1]);
      act(() => vi.advanceTimersByTime(200));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('closes modal when Escape key is pressed', () => {
      render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
      fireEvent.click(screen.getByAltText('NAV trend for X'));
      expect(screen.getByRole('dialog')).toBeInTheDocument();
      fireEvent.keyDown(window, { key: 'Escape' });
      act(() => vi.advanceTimersByTime(200));
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });

    it('reopening while closing cancels the pending unmount and shows the dialog again', () => {
      render(<NavGraphThumb base64="abc" alt="NAV trend for X" />);
      const thumb = screen.getByAltText('NAV trend for X');
      fireEvent.click(thumb);
      fireEvent.click(screen.getByRole('dialog')); // starts closing
      fireEvent.click(thumb); // reopen before the timer fires
      act(() => vi.advanceTimersByTime(200)); // the old close timer, if not cancelled, would fire here
      const dialog = screen.getByRole('dialog');
      expect(dialog).toBeInTheDocument();
      expect(dialog).not.toHaveClass('is-closing');
    });
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
