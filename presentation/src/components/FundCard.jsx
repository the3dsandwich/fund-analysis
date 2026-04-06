import StarButton from './StarButton';
import NavGraphThumb from './NavGraphThumb';
import { useFavorites } from '../contexts/FavoritesContext';

const formatAum = (value) => {
  if (value == null) return '-';
  return `$${value.toLocaleString('en-US')}m`;
};

const formatReturn = (value) => {
  if (value == null) return { text: '-', className: '' };
  const sign = value >= 0 ? '+' : '';
  return {
    text: `${sign}${value.toFixed(2)}%`,
    className: value >= 0 ? 'positive' : 'negative',
  };
};

const FUND_DETAIL_URL = 'https://www.cathaybk.com.tw/cathaybk/personal/investment/fund/details/?fundid=';

const renderStars = (rating) => {
  if (!rating) return null;
  const filled = Math.round(rating);
  return '\u2605'.repeat(filled) + '\u2606'.repeat(5 - filled);
};

const FundCard = ({ fund, dimmed = false }) => {
  const { isFundStarred, toggleFund } = useFavorites();
  const r1y = formatReturn(fund.return1Y);
  const ytd = formatReturn(fund.returnYTD);
  const r3m = formatReturn(fund.return3M);

  return (
    <div className={`fund-card${dimmed ? ' dimmed' : ''}${fund.navGraph ? ' has-graph' : ''}`}>
      <div className="fund-card-info">
        <div className="fund-header">
          <a
            className="fund-name"
            href={`${FUND_DETAIL_URL}${fund.id}`}
            target="_blank"
            rel="noopener noreferrer"
          >{fund.name}</a>
          <StarButton
            starred={isFundStarred(fund.id)}
            onClick={() => toggleFund(fund.id)}
          />
          {fund.englishName && (
            <div className="fund-english-name">{fund.englishName}</div>
          )}
        </div>
        <div className="fund-meta">
          <span className="fund-company">{fund.company}</span>
          <span className="fund-aum">{formatAum(fund.fundSizeMillionsUsd)}</span>
        </div>
        <div className="fund-returns">
          <span className="return-item">
            <span className="return-label">1Y</span>
            <span className={r1y.className}>{r1y.text}</span>
          </span>
          <span className="return-item">
            <span className="return-label">YTD</span>
            <span className={ytd.className}>{ytd.text}</span>
          </span>
          <span className="return-item">
            <span className="return-label">3M</span>
            <span className={r3m.className}>{r3m.text}</span>
          </span>
        </div>
        <div className="fund-details">
          <span>{fund.riskLevel || '-'}</span>
          {fund.starRating != null && <span>{renderStars(fund.starRating)}</span>}
          <span data-testid="yield">
            {fund.currentYield != null ? `${fund.currentYield.toFixed(2)}%` : '-'}
          </span>
        </div>
      </div>
      {fund.navGraph && (
        <NavGraphThumb
          base64={fund.navGraph}
          alt={`NAV trend for ${fund.name}`}
        />
      )}
    </div>
  );
};

export default FundCard;
