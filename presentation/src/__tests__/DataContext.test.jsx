import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DataProvider, useData } from '../contexts/DataContext';

const mockManifest = {
  latest: '2026-03-28',
  snapshots: [
    { date: '2026-03-28', category: 'daily' },
    { date: '2026-03-27', category: 'daily' },
  ],
};

const mockData = {
  totalFunds: 100,
  categorySummary: [],
  categories: {},
};

const TestConsumer = () => {
  const { data, date, loading, error, manifest, setDate } = useData();
  if (error) return <div>error: {error}</div>;
  return (
    <div>
      <div data-testid="date">{date || 'none'}</div>
      <div data-testid="funds">{data?.totalFunds ?? 'none'}</div>
      <div data-testid="snapshots">{manifest?.snapshots?.length ?? 'none'}</div>
      <div data-testid="loading">{loading ? 'yes' : 'no'}</div>
      <button onClick={() => setDate('2026-03-28')}>load</button>
    </div>
  );
};

describe('DataContext', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('fetches manifest on mount without auto-loading a snapshot', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('manifest.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) });
      }
      return Promise.reject(new Error('unexpected fetch: ' + url));
    });

    render(<DataProvider><TestConsumer /></DataProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('snapshots')).toHaveTextContent('2');
    });
    expect(screen.getByTestId('date')).toHaveTextContent('none');
    expect(screen.getByTestId('funds')).toHaveTextContent('none');
  });

  it('setDate triggers snapshot fetch and populates data', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation((url) => {
      if (url.includes('manifest.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockManifest) });
      }
      if (url.includes('2026-03-28.json')) {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(mockData) });
      }
      return Promise.reject(new Error('unexpected fetch: ' + url));
    });

    render(<DataProvider><TestConsumer /></DataProvider>);

    await waitFor(() => {
      expect(screen.getByTestId('snapshots')).toHaveTextContent('2');
    });

    fireEvent.click(screen.getByText('load'));

    await waitFor(() => {
      expect(screen.getByTestId('date')).toHaveTextContent('2026-03-28');
    });
    expect(screen.getByTestId('funds')).toHaveTextContent('100');
  });

  it('handles manifest 404 gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue({ ok: false, status: 404 });

    render(<DataProvider><TestConsumer /></DataProvider>);

    await waitFor(() => {
      expect(screen.getByText(/error:/)).toBeInTheDocument();
    });
  });

  it('handles network error gracefully', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'));

    render(<DataProvider><TestConsumer /></DataProvider>);

    await waitFor(() => {
      expect(screen.getByText(/error:/)).toBeInTheDocument();
    });
  });
});
