import { useParams, Link } from 'react-router-dom';
import { useState } from 'react';
import { useData } from '../contexts/DataContext';
import FundCard from '../components/FundCard';
import LoadingState from '../components/LoadingState';

const CategoryDetail = () => {
  const { name } = useParams();
  const categoryName = decodeURIComponent(name);
  const { data, loading, error } = useData();
  const [showSiblings, setShowSiblings] = useState(false);

  if (loading || !data) return <LoadingState />;
  if (error) return <LoadingState error={error} />;

  const category = data.categories[categoryName];

  if (!category) {
    return (
      <div className="container">
        <Link to="/">Back</Link>
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
      <Link to="/" className="back-link">Back</Link>
      <h1>{categoryName}</h1>
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
