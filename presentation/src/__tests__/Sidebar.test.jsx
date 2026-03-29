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
          { id: '001', name: 'Test Fund A', nav: 45.32, navGraph: 'abc123base64', isRepresentative: true },
        ],
      },
    },
  },
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
    expect(link).toHaveAttribute('href', expect.stringContaining('US%20Large%20Cap'));
  });

  it('shows starred fund as a link to its category', () => {
    mockFavorites.starredCategories = [];
    mockFavorites.starredFunds = ['001'];
    renderSidebar();
    const link = screen.getByRole('link', { name: /Test Fund A/ });
    expect(link).toHaveAttribute('href', expect.stringContaining('US%20Large%20Cap'));
  });

  it('shows NAV graph thumbnail for starred fund', () => {
    mockFavorites.starredCategories = [];
    mockFavorites.starredFunds = ['001'];
    renderSidebar();
    const img = screen.getByAltText(/nav trend/i);
    expect(img).toHaveAttribute('src', 'data:image/png;base64,abc123base64');
  });
});
