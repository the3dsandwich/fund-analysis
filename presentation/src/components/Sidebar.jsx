import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useFavorites } from '../contexts/FavoritesContext';
import { useData } from '../contexts/DataContext';

const findFundById = (data, fundId) => {
  if (!data?.categories) return null;
  for (const [catName, cat] of Object.entries(data.categories)) {
    const fund = cat.funds.find(f => f.id === fundId);
    if (fund) return { fund, categoryName: catName };
  }
  return null;
};

const SidebarContent = () => {
  const { starredCategories, starredFunds } = useFavorites();
  const { data } = useData();

  const isEmpty = starredCategories.length === 0 && starredFunds.length === 0;

  if (isEmpty) {
    return <p className="sidebar-empty">Star categories or funds for quick access</p>;
  }

  return (
    <>
      {starredCategories.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Categories</h3>
          {starredCategories.map(name => (
            <Link
              key={name}
              to={`/category/${encodeURIComponent(name)}`}
              className="sidebar-cat-link"
            >
              {name} <span className="sidebar-arrow">&rsaquo;</span>
            </Link>
          ))}
        </div>
      )}
      {starredFunds.length > 0 && (
        <div className="sidebar-section">
          <h3 className="sidebar-section-title">Funds</h3>
          {starredFunds.map(id => {
            const result = findFundById(data, id);
            if (!result) return null;
            const { fund, categoryName } = result;
            return (
              <Link
                key={id}
                to={`/category/${encodeURIComponent(categoryName)}`}
                className="sidebar-fund"
              >
                <span className="sidebar-fund-name">{fund.name}</span>
                {fund.navGraph && (
                  <img
                    className="nav-graph-thumb-sm"
                    src={`data:image/png;base64,${fund.navGraph}`}
                    alt={`NAV trend for ${fund.name}`}
                  />
                )}
                {fund.nav != null && (
                  <span className="sidebar-fund-nav">NAV: {fund.nav}</span>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
};

const Sidebar = () => {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="sidebar">
        <h2 className="sidebar-title">Starred</h2>
        <SidebarContent />
      </aside>

      {/* Mobile floating button + drawer */}
      <button
        className="fab-star"
        onClick={() => setDrawerOpen(true)}
        aria-label="Open starred items"
      >
        &#9733;
      </button>

      {drawerOpen && (
        <div className="drawer-backdrop" onClick={() => setDrawerOpen(false)}>
          <div className="drawer" onClick={e => e.stopPropagation()}>
            <div className="drawer-header">
              <h2 className="sidebar-title">Starred</h2>
              <button
                className="drawer-close"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close"
              >
                &times;
              </button>
            </div>
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};

export default Sidebar;
