import { render, screen, fireEvent } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, it, expect, vi } from 'vitest';
import CategoryDetail from '../pages/CategoryDetail';

vi.mock('../contexts/DataContext', () => ({
  useData: () => ({
    data: {
      categories: {
        'US Large Cap': {
          macro: 'Equity - US',
          fundCount: 4,
          uniqueCount: 2,
          funds: [
            {
              id: '001', name: '\u4ee3\u8868\u57fa\u91d1A', englishName: 'Rep Fund A', company: 'Company A',
              fundSizeMillionsUsd: 18000, return1Y: 9.44, returnYTD: -3.70, return3M: -3.74,
              riskLevel: '\u7a69\u5065\u578b', starRating: 4, currentYield: 8.78,
              isRepresentative: true, siblingCount: 2,
            },
            {
              id: '002', name: '\u4ee3\u8868\u57fa\u91d1B', englishName: 'Rep Fund B', company: 'Company B',
              fundSizeMillionsUsd: 5000, return1Y: 7.2, returnYTD: 1.5, return3M: 0.8,
              riskLevel: '\u7a4d\u6975\u578b', starRating: 3, currentYield: null,
              isRepresentative: true, siblingCount: 1,
            },
            {
              id: '003', name: '\u540c\u985e\u57fa\u91d1C(\u6708\u914d)', englishName: null, company: 'Company A',
              fundSizeMillionsUsd: 18000, return1Y: 9.44, returnYTD: -3.70, return3M: -3.74,
              riskLevel: '\u7a69\u5065\u578b', starRating: 4, currentYield: 8.78,
              isRepresentative: false, siblingCount: 2,
            },
            {
              id: '004', name: '\u540c\u985e\u57fa\u91d1D(\u907f\u96aa)', englishName: null, company: 'Company B',
              fundSizeMillionsUsd: 5000, return1Y: 7.0, returnYTD: 1.3, return3M: 0.6,
              riskLevel: '\u7a4d\u6975\u578b', starRating: 3, currentYield: null,
              isRepresentative: false, siblingCount: 1,
            },
          ],
        },
      },
    },
    manifest: { latest: '2026-03-28', snapshots: [{ date: '2026-03-28', category: 'daily' }] },
    loading: false,
    error: null,
  }),
}));

vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    isCategoryStarred: () => false,
    toggleCategory: vi.fn(),
    isFundStarred: () => false,
    toggleFund: vi.fn(),
  }),
}));

const renderWithRoute = (categoryName = 'US Large Cap') => render(
  <MemoryRouter initialEntries={[`/2026-03-28/category/${encodeURIComponent(categoryName)}`]}>
    <Routes>
      <Route path="/:date/category/:name" element={<CategoryDetail />} />
    </Routes>
  </MemoryRouter>
);

describe('CategoryDetail', () => {
  it('shows category name as heading', () => {
    renderWithRoute();
    expect(screen.getByRole('heading', { name: 'US Large Cap' })).toBeInTheDocument();
  });

  it('renders representative funds prominently', () => {
    renderWithRoute();
    expect(screen.getByText('\u4ee3\u8868\u57fa\u91d1A')).toBeInTheDocument();
    expect(screen.getByText('\u4ee3\u8868\u57fa\u91d1B')).toBeInTheDocument();
  });

  it('siblings section starts collapsed', () => {
    renderWithRoute();
    expect(screen.queryByText('\u540c\u985e\u57fa\u91d1C(\u6708\u914d)')).not.toBeInTheDocument();
    expect(screen.queryByText('\u540c\u985e\u57fa\u91d1D(\u907f\u96aa)')).not.toBeInTheDocument();
  });

  it('toggles sibling visibility on click', () => {
    renderWithRoute();
    const toggle = screen.getByRole('button', { name: /share class/i });
    fireEvent.click(toggle);
    expect(screen.getByText('\u540c\u985e\u57fa\u91d1C(\u6708\u914d)')).toBeInTheDocument();
    expect(screen.getByText('\u540c\u985e\u57fa\u91d1D(\u907f\u96aa)')).toBeInTheDocument();
  });

  it('shows back link to date root', () => {
    renderWithRoute();
    const backLink = screen.getByRole('link', { name: /back/i });
    expect(backLink).toHaveAttribute('href', '/2026-03-28');
  });

  it('shows macro label', () => {
    renderWithRoute();
    expect(screen.getByText('Equity - US')).toBeInTheDocument();
  });

  it('shows category star button', () => {
    renderWithRoute();
    // Category star + 2 fund stars (representatives only, siblings are hidden)
    const starBtns = screen.getAllByRole('button', { name: /favorites/i });
    expect(starBtns.length).toBeGreaterThanOrEqual(1);
  });
});
