import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CategoryList from '../pages/CategoryList';

const testData = {
  generatedAt: '2026-03-24T00:00:00.000Z',
  totalFunds: 10,
  totalUnique: 5,
  categorySummary: [
    { name: 'US Large Cap', macro: 'Equity - US', fundCount: 4, uniqueCount: 3, thin: false },
    { name: 'US Small/Mid Cap', macro: 'Equity - US', fundCount: 2, uniqueCount: 1, thin: true },
    { name: 'Global Equity', macro: 'Equity - Global', fundCount: 4, uniqueCount: 2, thin: false },
  ],
  categories: {
    'US Large Cap': {
      macro: 'Equity - US',
      fundCount: 4,
      uniqueCount: 3,
      funds: [
        {
          id: '001', name: '\u6e2c\u8a66\u57fa\u91d1A', fundSizeMillionsUsd: 18000, return1Y: 9.44,
          isRepresentative: true, navGraph: 'repgraphbase64',
        },
        {
          id: '002', name: '\u6e2c\u8a66\u57fa\u91d1B', fundSizeMillionsUsd: 5000, return1Y: 7.2,
          isRepresentative: true,
        },
      ],
    },
    'US Small/Mid Cap': {
      macro: 'Equity - US',
      fundCount: 2,
      uniqueCount: 1,
      funds: [
        {
          id: '003', name: '\u5c0f\u578b\u57fa\u91d1', fundSizeMillionsUsd: 500, return1Y: -2.1,
          isRepresentative: true,
        },
      ],
    },
    'Global Equity': {
      macro: 'Equity - Global',
      fundCount: 4,
      uniqueCount: 2,
      funds: [
        {
          id: '004', name: '\u5168\u7403\u57fa\u91d1', fundSizeMillionsUsd: 10000, return1Y: 5.5,
          isRepresentative: true,
        },
      ],
    },
  },
};

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    data: testData,
    date: '2026-03-28',
    setDate: () => {},
    manifest: { latest: '2026-03-28', snapshots: [{ date: '2026-03-28', category: 'daily' }] },
    loading: false,
    error: null,
  }),
}));

vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    isCategoryStarred: () => false,
    toggleCategory: vi.fn(),
  }),
}));

const renderWithRouter = () => render(
  <MemoryRouter initialEntries={['/2026-03-28']}>
    <Routes>
      <Route path="/:date" element={<CategoryList />} />
    </Routes>
  </MemoryRouter>
);

describe('CategoryList', () => {
  it('renders macro group headings', () => {
    renderWithRouter();
    expect(screen.getByText('Equity - US')).toBeInTheDocument();
    expect(screen.getByText('Equity - Global')).toBeInTheDocument();
  });

  it('renders category names', () => {
    renderWithRouter();
    expect(screen.getByText('US Large Cap')).toBeInTheDocument();
    expect(screen.getByText('US Small/Mid Cap')).toBeInTheDocument();
    expect(screen.getByText('Global Equity')).toBeInTheDocument();
  });

  it('shows unique fund count', () => {
    renderWithRouter();
    expect(screen.getByText(/3 unique/)).toBeInTheDocument();
    expect(screen.getByText(/1 unique/)).toBeInTheDocument();
  });

  it('shows top representative fund info', () => {
    renderWithRouter();
    expect(screen.getByText('\u6e2c\u8a66\u57fa\u91d1A')).toBeInTheDocument();
  });

  it('flags thin categories', () => {
    renderWithRouter();
    const thinBadges = screen.getAllByText('thin');
    expect(thinBadges.length).toBeGreaterThanOrEqual(1);
  });

  it('category cards link to correct routes with date prefix', () => {
    renderWithRouter();
    const link = screen.getByRole('link', { name: /US Large Cap/ });
    expect(link).toHaveAttribute('href', '/2026-03-28/category/US%20Large%20Cap');
  });

  it('renders rep fund NAV graph as direct child of category card link with has-graph class', () => {
    renderWithRouter();
    const link = screen.getByRole('link', { name: /US Large Cap/ });
    expect(link).toHaveClass('has-graph');
    const img = screen.getByAltText('NAV trend for US Large Cap');
    expect(img).toHaveAttribute('src', 'data:image/png;base64,repgraphbase64');
    // Chart is a direct child of the link, not inside .category-rep
    expect(img.parentElement).toBe(link);
  });

  it('renders star buttons for each category', () => {
    renderWithRouter();
    const starBtns = screen.getAllByRole('button', { name: /favorites/i });
    expect(starBtns.length).toBe(3);
  });
});
