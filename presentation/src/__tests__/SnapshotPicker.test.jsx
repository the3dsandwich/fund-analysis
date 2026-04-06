import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import { describe, it, expect } from 'vitest';
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

const LocationProbe = () => {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
};

const renderAt = (path, routePattern) => render(
  <MemoryRouter initialEntries={[path]}>
    <Routes>
      <Route path={routePattern} element={
        <>
          <SnapshotPicker manifest={mockManifest} date="2026-03-28" />
          <LocationProbe />
        </>
      } />
      <Route path="*" element={<LocationProbe />} />
    </Routes>
  </MemoryRouter>
);

describe('SnapshotPicker', () => {
  it('renders grouped dates from manifest', () => {
    renderAt('/2026-03-28', '/:date');
    expect(screen.getByRole('combobox')).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Recent' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Weekly' })).toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Monthly' })).toBeInTheDocument();
  });

  it('shows current date as selected', () => {
    renderAt('/2026-03-28', '/:date');
    expect(screen.getByRole('combobox').value).toBe('2026-03-28');
  });

  it('navigates to /:date when changed on list page', () => {
    renderAt('/2026-03-28', '/:date');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2026-03-20' } });
    expect(screen.getByTestId('loc')).toHaveTextContent('/2026-03-20');
  });

  it('preserves category path when changed on detail page', () => {
    renderAt('/2026-03-28/category/US%20Large%20Cap', '/:date/category/:name');
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '2026-03-20' } });
    expect(screen.getByTestId('loc')).toHaveTextContent('/2026-03-20/category/US%20Large%20Cap');
  });

  it('renders nothing when manifest has no snapshots', () => {
    const { container } = render(
      <MemoryRouter>
        <SnapshotPicker manifest={{ latest: null, snapshots: [] }} date="" />
      </MemoryRouter>
    );
    expect(container.firstChild).toBeNull();
  });
});
