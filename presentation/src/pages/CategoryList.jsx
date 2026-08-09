import { Link, useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { useFavorites } from '../contexts/FavoritesContext';
import SnapshotPicker from '../components/SnapshotPicker';
import StarButton from '../components/StarButton';
import NavGraphThumb from '../components/NavGraphThumb';
import { groupByMacro } from '../utils/groupByMacro';

const getTopRep = (data, categoryName) => {
  const cat = data.categories[categoryName];
  if (!cat) return null;
  return cat.funds
    .filter(f => f.isRepresentative)
    .sort((a, b) => (b.fundSizeMillionsUsd || 0) - (a.fundSizeMillionsUsd || 0))[0];
};

const CategoryList = () => {
  const { date } = useParams();
  const { data, manifest } = useData();
  const { isCategoryStarred, toggleCategory } = useFavorites();

  const groups = groupByMacro(data.categorySummary);

  return (
    <div className="container">
      <div className="page-header">
        <h1>Fund Categories</h1>
        <SnapshotPicker manifest={manifest} date={date} />
      </div>
      <p className="subtitle">
        {data.totalUnique} unique funds across {data.categorySummary.length} categories
        {date && <span className="date-label"> | Data: {date}</span>}
      </p>
      {groups.map(group => (
        <section key={group.macro} className="macro-section">
          <h2 className="macro-heading">{group.macro}</h2>
          <div className="category-grid">
            {group.categories.map(cat => {
              const rep = getTopRep(data, cat.name);
              return (
                <Link
                  key={cat.name}
                  to={`/${date}/category/${encodeURIComponent(cat.name)}`}
                  className={`category-card${cat.thin ? ' thin' : ''}${rep?.navGraph ? ' has-graph' : ''}`}
                >
                  <div className="category-card-main">
                    <div className="category-card-header">
                      <span className="category-name">{cat.name}</span>
                      <StarButton
                        starred={isCategoryStarred(cat.name)}
                        onClick={() => toggleCategory(cat.name)}
                      />
                      {cat.thin && <span className="thin-badge">thin</span>}
                    </div>
                    <div className="category-counts">
                      {cat.uniqueCount} unique / {cat.fundCount} total
                    </div>
                    {rep && (
                      <div className="category-rep">
                        <span className="rep-name">{rep.name}</span>
                        <span className="rep-stats">
                          {rep.fundSizeMillionsUsd != null
                            ? `$${rep.fundSizeMillionsUsd.toLocaleString('en-US')}m`
                            : ''}
                          {rep.return1Y != null && (
                            <>
                              {' | '}
                              <span className={rep.return1Y >= 0 ? 'positive' : 'negative'}>
                                {rep.return1Y >= 0 ? '+' : ''}{rep.return1Y.toFixed(2)}%
                              </span>
                            </>
                          )}
                        </span>
                      </div>
                    )}
                  </div>
                  {rep?.navGraph && (
                    <NavGraphThumb
                      base64={rep.navGraph}
                      alt={`NAV trend for ${cat.name}`}
                    />
                  )}
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
};

export default CategoryList;
