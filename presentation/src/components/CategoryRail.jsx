import { Link, useLocation } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import { groupByMacro } from '../utils/groupByMacro';

const CATEGORY_ROUTE = /^\/[^/]+\/category\/(.+)$/;

/**
 * Persistent left-hand navigation: every category, always visible, so
 * drilling into one doesn't lose your place among the rest. Deliberately
 * lighter than the CategoryList cards — this is for jumping around, not
 * for analysis, so no AUM/return figures here (see FundCard/CategoryList
 * for that). Rendered as a sibling of <Routes> in main.jsx, so it reads
 * the current category from the URL via useLocation() rather than
 * useParams() (which only sees params of the route actually matched).
 */
const CategoryRail = () => {
  const { data, date, manifest } = useData();
  const location = useLocation();
  const effectiveDate = date || manifest?.latest;

  if (!data || !effectiveDate) return null;

  const match = location.pathname.match(CATEGORY_ROUTE);
  const activeCategory = match ? decodeURIComponent(match[1]) : null;

  const groups = groupByMacro(data.categorySummary);

  return (
    <nav className="category-rail" aria-label="All categories">
      {groups.map(group => (
        <div key={group.macro} className="rail-section">
          <h3 className="rail-section-title">{group.macro}</h3>
          {group.categories.map(cat => (
            <Link
              key={cat.name}
              to={`/${effectiveDate}/category/${encodeURIComponent(cat.name)}`}
              className={`rail-link${cat.name === activeCategory ? ' rail-link-active' : ''}`}
            >
              <span className="rail-link-name">{cat.name}</span>
              {cat.thin && (
                <span className="rail-thin-dot" role="img" aria-label="thin category" title="Thin category (few funds)" />
              )}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
};

export default CategoryRail;
