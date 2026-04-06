import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import FundCard from '../components/FundCard';

vi.mock('../contexts/FavoritesContext', () => ({
  useFavorites: () => ({
    isFundStarred: () => false,
    toggleFund: vi.fn(),
  }),
}));

const baseFund = {
  id: '00100001',
  name: '\u5bcc\u862d\u514b\u6797\u9ad8\u6210\u9577\u57fa\u91d1A(acc)',
  englishName: 'Franklin Growth Fund A',
  company: 'Franklin Templeton',
  fundSizeMillionsUsd: 18393,
  return1Y: 9.44,
  returnYTD: -3.70,
  return3M: -3.74,
  riskLevel: '\u7a69\u5065\u578b',
  starRating: 4,
  currentYield: 8.78,
  isRepresentative: true,
  siblingCount: 3,
};

describe('FundCard', () => {
  it('renders Chinese fund name prominently', () => {
    render(<FundCard fund={baseFund} />);
    const nameEl = screen.getByText('\u5bcc\u862d\u514b\u6797\u9ad8\u6210\u9577\u57fa\u91d1A(acc)');
    expect(nameEl).toBeInTheDocument();
    expect(nameEl).toHaveClass('fund-name');
  });

  it('links fund name to Cathay detail page in new tab', () => {
    render(<FundCard fund={baseFund} />);
    const link = screen.getByRole('link', { name: /\u5bcc\u862d\u514b\u6797\u9ad8\u6210\u9577\u57fa\u91d1A/ });
    expect(link).toHaveAttribute('href', 'https://www.cathaybk.com.tw/cathaybk/personal/investment/fund/details/?fundid=00100001');
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', expect.stringContaining('noopener'));
  });

  it('renders English name with secondary styling', () => {
    render(<FundCard fund={baseFund} />);
    const enEl = screen.getByText('Franklin Growth Fund A');
    expect(enEl).toBeInTheDocument();
    expect(enEl).toHaveClass('fund-english-name');
  });

  it('hides English name when not available', () => {
    const fund = { ...baseFund, englishName: null };
    render(<FundCard fund={fund} />);
    expect(screen.queryByText('Franklin Growth Fund A')).not.toBeInTheDocument();
  });

  it('shows AUM formatted as $X,XXXm', () => {
    render(<FundCard fund={baseFund} />);
    expect(screen.getByText('$18,393m')).toBeInTheDocument();
  });

  it('colors positive returns green', () => {
    render(<FundCard fund={baseFund} />);
    const el = screen.getByText('+9.44%');
    expect(el).toHaveClass('positive');
  });

  it('colors negative returns red', () => {
    render(<FundCard fund={baseFund} />);
    const el = screen.getByText('-3.70%');
    expect(el).toHaveClass('negative');
  });

  it('applies dimmed styling when dimmed prop is true', () => {
    const { container } = render(<FundCard fund={baseFund} dimmed />);
    expect(container.firstChild).toHaveClass('dimmed');
  });

  it('does not apply dimmed styling by default', () => {
    const { container } = render(<FundCard fund={baseFund} />);
    expect(container.firstChild).not.toHaveClass('dimmed');
  });

  it('shows star rating with unicode stars', () => {
    render(<FundCard fund={baseFund} />);
    expect(screen.getByText('\u2605\u2605\u2605\u2605\u2606')).toBeInTheDocument();
  });

  it('shows company name', () => {
    render(<FundCard fund={baseFund} />);
    expect(screen.getByText('Franklin Templeton')).toBeInTheDocument();
  });

  it('shows yield when available', () => {
    render(<FundCard fund={baseFund} />);
    expect(screen.getByText('8.78%')).toBeInTheDocument();
  });

  it('shows dash for yield when not available', () => {
    const fund = { ...baseFund, currentYield: null };
    render(<FundCard fund={fund} />);
    expect(screen.getByTestId('yield')).toHaveTextContent('-');
  });

  it('renders star toggle button', () => {
    render(<FundCard fund={baseFund} />);
    expect(screen.getByRole('button', { name: /favorites/i })).toBeInTheDocument();
  });

  it('shows NAV graph thumbnail when available', () => {
    const fund = { ...baseFund, navGraph: 'base64data' };
    const { container } = render(<FundCard fund={fund} />);
    const img = screen.getByAltText(/nav trend/i);
    expect(img).toHaveAttribute('src', 'data:image/png;base64,base64data');
    expect(img).toHaveClass('nav-graph-thumb');
    // Stacked layout: no side-by-side flex wrapper class
    expect(container.firstChild).not.toHaveClass('fund-card-with-graph');
  });

  it('hides NAV graph when not available', () => {
    render(<FundCard fund={baseFund} />);
    expect(screen.queryByAltText(/nav trend/i)).not.toBeInTheDocument();
  });
});
