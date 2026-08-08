import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import { useFavorites } from '../contexts/FavoritesContext';
import FundCard from '../components/FundCard';
import SnapshotPicker from '../components/SnapshotPicker';
import StarButton from '../components/StarButton';

const CategoryDetail = () => {
  const { date, name } = useParams();
  const categoryName = decodeURIComponent(name);
  const { data, manifest } = useData();
  const { isCategoryStarred, toggleCategory } = useFavorites();
  const [showSiblings, setShowSiblings] = useState(false);

  const category = data.categories[categoryName];

  if (!category) {
    return (
      <div className="container">
        <Link to={`/${date}`}>Back</Link>
        <h1>Category not found</h1>
        <p>No category named "{categoryName}"</p>
      </div>
    );
  }

  const representatives = category.funds
    .filter(f => f.isRepresentative)
    .sort((a, b) => (b.fundSizeMillionsUsd || 0) - (a.fundSizeMillionsUsd || 0));

  const siblings = category.funds.filter(f => !f.isRepresentative);

  return (
    <div className="container">
      <div className="page-header">
        <Link to={`/${date}`} className="back-link">Back</Link>
        <SnapshotPicker manifest={manifest} date={date} />
      </div>
      <div className="category-detail-header">
        <h1>{categoryName}</h1>
        <StarButton
          starred={isCategoryStarred(categoryName)}
          onClick={() => toggleCategory(categoryName)}
        />
      </div>
      <div className="category-meta">
        <span className="macro-label">{category.macro}</span>
        <span>{category.uniqueCount} unique / {category.fundCount} total</span>
      </div>

      <section className="representatives">
        <h2>Representative Funds</h2>
        {representatives.map(fund => (
          <FundCard key={fund.id} fund={fund} />
        ))}
      </section>

      {siblings.length > 0 && (
        <section className="siblings" data-open={showSiblings}>
          <button
            className="siblings-toggle"
            onClick={() => setShowSiblings(!showSiblings)}
            aria-expanded={showSiblings}
          >
            {showSiblings ? 'Hide' : 'Show'} {siblings.length} share class variants
            <span className="t-acc-chevron" aria-hidden="true">
              <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M4 6.5L8 10.5L12 6.5" />
              </svg>
            </span>
          </button>
          <div className="t-acc-panel">
            <div className="t-acc-panel-inner siblings-list">
              {siblings.map(fund => (
                <FundCard key={fund.id} fund={fund} dimmed />
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default CategoryDetail;
