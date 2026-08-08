import { render, screen } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CategoryRail from '../components/CategoryRail';

const testData = {
  categorySummary: [
    { name: 'US Large Cap', macro: 'Equity - US', fundCount: 4, uniqueCount: 3, thin: false },
    { name: 'US Small/Mid Cap', macro: 'Equity - US', fundCount: 2, uniqueCount: 1, thin: true },
    { name: 'Global Equity', macro: 'Equity - Global', fundCount: 4, uniqueCount: 2, thin: false },
  ],
};

const useDataMock = vi.hoisted(() => vi.fn());

vi.mock('../contexts/DataContext', () => ({
  useData: useDataMock,
}));

const renderRail = (initialEntry) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <CategoryRail />
  </MemoryRouter>
);

describe('CategoryRail', () => {
  beforeEach(() => {
    useDataMock.mockReturnValue({
      data: testData,
      date: '2026-03-28',
      manifest: { latest: '2026-03-28' },
    });
  });

  it('renders macro group headings', () => {
    renderRail('/2026-03-28');
    expect(screen.getByText('Equity - US')).toBeInTheDocument();
    expect(screen.getByText('Equity - Global')).toBeInTheDocument();
  });

  it('renders every category as a link', () => {
    renderRail('/2026-03-28');
    expect(screen.getByRole('link', { name: /US Large Cap/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /US Small\/Mid Cap/ })).toBeInTheDocument();
    expect(screen.getByRole('link', { name: /Global Equity/ })).toBeInTheDocument();
  });

  it('links point at the category detail route with the current date', () => {
    renderRail('/2026-03-28');
    const link = screen.getByRole('link', { name: /US Large Cap/ });
    expect(link).toHaveAttribute('href', '/2026-03-28/category/US%20Large%20Cap');
  });

  it('marks the currently viewed category as active', () => {
    renderRail('/2026-03-28/category/US%20Large%20Cap');
    expect(screen.getByRole('link', { name: /US Large Cap/ })).toHaveClass('rail-link-active');
    expect(screen.getByRole('link', { name: /Global Equity/ })).not.toHaveClass('rail-link-active');
  });

  it('marks nothing active on the root list route', () => {
    renderRail('/2026-03-28');
    for (const link of screen.getAllByRole('link')) {
      expect(link).not.toHaveClass('rail-link-active');
    }
  });

  it('flags thin categories', () => {
    renderRail('/2026-03-28');
    expect(screen.getByRole('img', { name: /thin category/i })).toBeInTheDocument();
  });

  it('falls back to the manifest date when no date param is set yet', () => {
    useDataMock.mockReturnValue({
      data: testData,
      date: null,
      manifest: { latest: '2026-04-01' },
    });
    renderRail('/');
    const link = screen.getByRole('link', { name: /US Large Cap/ });
    expect(link).toHaveAttribute('href', '/2026-04-01/category/US%20Large%20Cap');
  });

  it('renders nothing while data has not loaded yet', () => {
    useDataMock.mockReturnValue({ data: null, date: null, manifest: null });
    const { container } = renderRail('/');
    expect(container).toBeEmptyDOMElement();
  });
});
