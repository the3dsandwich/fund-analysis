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
        <section className="siblings">
          <button
            className="siblings-toggle"
            onClick={() => setShowSiblings(!showSiblings)}
          >
            {showSiblings ? 'Hide' : 'Show'} {siblings.length} share class variants
          </button>
          {showSiblings && (
            <div className="siblings-list">
              {siblings.map(fund => (
                <FundCard key={fund.id} fund={fund} dimmed />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
};

export default CategoryDetail;
