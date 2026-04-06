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
    categorySummary: [
      { name: 'US Large Cap', macro: 'Equity - US' },
      { name: 'Global Equity', macro: 'Equity - Global' },
      { name: 'Asia Bonds', macro: 'Bond - Asia' },
    ],
    categories: {
      'US Large Cap': {
        macro: 'Equity - US',
        funds: [
          {
            id: '001',
            name: 'Test Fund A',
            company: 'Vanguard',
            navGraph: 'abc123base64',
            isRepresentative: true,
            fundSizeMillionsUsd: 10000,
            return3M: 2.34,
          },
          {
            id: '002',
            name: 'Test Fund B',
            company: 'BlackRock',
            isRepresentative: false,
            return3M: 1.0,
          },
        ],
      },
      'Global Equity': {
        macro: 'Equity - Global',
        funds: [
          {
            id: '010',
            name: 'Global Fund',
            company: 'Fidelity',
            isRepresentative: true,
            fundSizeMillionsUsd: 5000,
            return3M: -0.5,
          },
        ],
      },
      'Asia Bonds': {
        macro: 'Bond - Asia',
        funds: [
          {
            id: '020',
            name: 'Asia Bond Fund',
            company: 'PIMCO',
            isRepresentative: true,
            fundSizeMillionsUsd: 3000,
            return3M: 0.2,
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

  it('sorts starred categories to match main page (categorySummary) order', () => {
    mockFavorites.starredCategories = ['Asia Bonds', 'US Large Cap', 'Global Equity'];
    mockFavorites.starredFunds = [];
    renderSidebar();
    const links = screen.getAllByRole('link').map(a => a.textContent);
    const order = links.map(t => ['US Large Cap', 'Global Equity', 'Asia Bonds'].find(n => t.startsWith(n)));
    expect(order).toEqual(['US Large Cap', 'Global Equity', 'Asia Bonds']);
  });

  it('sorts starred funds by category order then by company name', () => {
    // 010 = Global Equity / Fidelity
    // 020 = Asia Bonds / PIMCO
    // 002 = US Large Cap / BlackRock
    // 001 = US Large Cap / Vanguard
    mockFavorites.starredCategories = [];
    mockFavorites.starredFunds = ['010', '020', '002', '001'];
    renderSidebar();
    const names = screen.getAllByRole('link').map(a => a.textContent);
    // US Large Cap first (BlackRock < Vanguard), then Global Equity, then Asia Bonds
    expect(names[0]).toContain('Test Fund B');
    expect(names[1]).toContain('Test Fund A');
    expect(names[2]).toContain('Global Fund');
    expect(names[3]).toContain('Asia Bond Fund');
  });
});
