import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import SnapshotPicker from '../components/SnapshotPicker';

const mockManifest = {
  latest: '2026-03-28',
  snapshots: [
    { date: '2026-03-28', category: 'daily' },
    { date: '2026-03-27', category: 'daily' },
    { date: '2026-03-20', category: 'weekly' },
    { date: '2026-02-28', category: 'monthly' },
  ],
};

describe('SnapshotPicker', () => {
  it('renders grouped dates from manifest', () => {
    render(<SnapshotPicker manifest={mockManifest} date="2026-03-28" onDateChange={() => {}} />);
    const select = screen.getByRole('combobox');
    expect(select).toBeInTheDocument();
    // Should have optgroups (label is an attribute, not text content)
    expect(screen.getByRole('group', { name: 'Recent' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Weekly' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Monthly' })).toBeInTheDocument();
  });

  it('shows current date as selected', () => {
    render(<SnapshotPicker manifest={mockManifest} date="2026-03-27" onDateChange={() => {}} />);
    const select = screen.getByRole('combobox');
    expect(select.value).toBe('2026-03-27');
  });

  it('calls onDateChange when selection changes', () => {
    const onChange = vi.fn();
    render(<SnapshotPicker manifest={mockManifest} date="2026-03-28" onDateChange={onChange} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: '2026-03-20' } });
    expect(onChange).toHaveBeenCalledWith('2026-03-20');
  });

  it('renders nothing when manifest has no snapshots', () => {
    const emptyManifest = { latest: null, snapshots: [] };
    const { container } = render(<SnapshotPicker manifest={emptyManifest} date="" onDateChange={() => {}} />);
    expect(container.firstChild).toBeNull();
  });
});
