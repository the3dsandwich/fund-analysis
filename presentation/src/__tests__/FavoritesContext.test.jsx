import { render, screen, act } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { FavoritesProvider, useFavorites } from '../contexts/FavoritesContext';

const STORAGE_KEY = 'fund-analysis-favorites';

const TestConsumer = () => {
  const {
    toggleCategory, toggleFund,
    isCategoryStarred, isFundStarred,
    starredCategories, starredFunds,
  } = useFavorites();

  return (
    <div>
      <span data-testid="cat-starred">{starredCategories.join(',')}</span>
      <span data-testid="fund-starred">{starredFunds.join(',')}</span>
      <span data-testid="cat-check">{String(isCategoryStarred('US Large Cap'))}</span>
      <span data-testid="fund-check">{String(isFundStarred('001'))}</span>
      <button onClick={() => toggleCategory('US Large Cap')}>toggle-cat</button>
      <button onClick={() => toggleFund('001')}>toggle-fund</button>
    </div>
  );
};

describe('FavoritesContext', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('starts with empty favorites', () => {
    render(<FavoritesProvider><TestConsumer /></FavoritesProvider>);
    expect(screen.getByTestId('cat-starred')).toHaveTextContent('');
    expect(screen.getByTestId('fund-starred')).toHaveTextContent('');
  });

  it('toggles a category on and off', () => {
    render(<FavoritesProvider><TestConsumer /></FavoritesProvider>);
    const btn = screen.getByText('toggle-cat');

    act(() => btn.click());
    expect(screen.getByTestId('cat-check')).toHaveTextContent('true');
    expect(screen.getByTestId('cat-starred')).toHaveTextContent('US Large Cap');

    act(() => btn.click());
    expect(screen.getByTestId('cat-check')).toHaveTextContent('false');
    expect(screen.getByTestId('cat-starred')).toHaveTextContent('');
  });

  it('toggles a fund on and off', () => {
    render(<FavoritesProvider><TestConsumer /></FavoritesProvider>);
    const btn = screen.getByText('toggle-fund');

    act(() => btn.click());
    expect(screen.getByTestId('fund-check')).toHaveTextContent('true');
    expect(screen.getByTestId('fund-starred')).toHaveTextContent('001');

    act(() => btn.click());
    expect(screen.getByTestId('fund-check')).toHaveTextContent('false');
    expect(screen.getByTestId('fund-starred')).toHaveTextContent('');
  });

  it('persists favorites to localStorage', () => {
    render(<FavoritesProvider><TestConsumer /></FavoritesProvider>);
    act(() => screen.getByText('toggle-cat').click());
    act(() => screen.getByText('toggle-fund').click());

    const stored = JSON.parse(localStorage.getItem(STORAGE_KEY));
    expect(stored.categories).toContain('US Large Cap');
    expect(stored.funds).toContain('001');
  });

  it('loads favorites from localStorage on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      categories: ['US Large Cap'],
      funds: ['001'],
    }));

    render(<FavoritesProvider><TestConsumer /></FavoritesProvider>);
    expect(screen.getByTestId('cat-check')).toHaveTextContent('true');
    expect(screen.getByTestId('fund-check')).toHaveTextContent('true');
  });
});
