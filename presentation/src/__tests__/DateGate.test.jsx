import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import DateGate from '../components/DateGate';
import { DataProvider } from '../contexts/DataContext';

const mockManifest = {
  latest: '2026-03-28',
  snapshots: [{ date: '2026-03-28', category: 'daily' }],
};

const mockData = { totalFunds: 42, categorySummary: [], categories: {} };

describe('DateGate', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('shows loading, then renders children once the URL date matches context', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('manifest.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) });
      }
      if (url.includes('2026-03-28.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) });
      }
      return Promise.reject(new Error('unexpected fetch: ' + url));
    });

    render(
      <DataProvider>
        <MemoryRouter initialEntries={['/2026-03-28']}>
          <Routes>
            <Route path="/:date" element={
              <DateGate><div data-testid="child">loaded</div></DateGate>
            } />
          </Routes>
        </MemoryRouter>
      </DataProvider>
    );

    expect(screen.queryByTestId('child')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('child')).toHaveTextContent('loaded');
    });
  });
});
