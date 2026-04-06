import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import Sidebar from '../components/Sidebar';

const mockFavorites = {
  starredCategories: [],
  starredFunds: [],
  toggleCategory: vi.fn(),
  toggleFund: vi.fn(),
  isCategoryStarred: () => false,
  isFundStarred: () => false,
};

vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => mockFavorites,
}));

const mockData = {
  data: {
    categories: {
      'US Large Cap': {
        macro: 'Equity - US',
        funds: [
          {
            id: '001',
            name: 'Test Fund A',
            nav: 45.32,
            navGraph: 'abc123base64',
            isRepresentative: true,
            fundSizeMillionsUsd: 10000,
            return3M: 2.34,
          },
        ],
      },
    },
  },
  date: '2026-03-28',
  manifest: { latest: '2026-03-28' },
  loading: false,
  error: null,
};

vi.mock('../contexts/DataContext', () => ({
  useData: () => mockData,
}));

const renderSidebar = () => render(
  <MemoryRouter>
    <Sidebar />
  </MemoryRouter>
);

describe('Sidebar', () => {
  it('shows empty state when nothing is starred', () => {
    mockFavorites.starredCategories = [];
    mockFavorites.starredFunds = [];
    renderSidebar();
    expect(screen.getByText(/star categories or funds/i)).toBeInTheDocument();
  });

  it('shows starred category as a link', () => {
    mockFavorites.starredCategories = ['US Large Cap'];
    mockFavorites.starredFunds = [];
    renderSidebar();
    const link = screen.getByRole('link', { name: /US Large Cap/ });
    expect(link).toHaveAttribute('href', '/2026-03-28/category/US%20Large%20Cap');
  });

  it('shows starred fund as a link to its category with date prefix', () => {
    mockFavorites.starredCategories = [];
    mockFavorites.starredFunds = ['001'];
    renderSidebar();
    const link = screen.getByRole('link', { name: /Test Fund A/ });
    expect(link).toHaveAttribute('href', '/2026-03-28/category/US%20Large%20Cap');
  });

  it('does NOT show NAV graph for starred fund (compact view)', () => {
    mockFavorites.starredCategories = [];
    mockFavorites.starredFunds = ['001'];
    renderSidebar();
    expect(screen.queryByAltText(/nav trend/i)).not.toBeInTheDocument();
  });

  it('shows 3M return for starred fund with color class', () => {
    mockFavorites.starredCategories = [];
    mockFavorites.starredFunds = ['001'];
    renderSidebar();
    const el = screen.getByText('+2.34%');
    expect(el).toHaveClass('positive');
  });

  it('shows 3M return of top rep for starred category', () => {
    mockFavorites.starredCategories = ['US Large Cap'];
    mockFavorites.starredFunds = [];
    renderSidebar();
    const el = screen.getByText('+2.34%');
    expect(el).toHaveClass('positive');
  });
});
