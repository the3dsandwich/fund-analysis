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

const getTopRep = (data, categoryName) => {
  const cat = data?.categories?.[categoryName];
  if (!cat) return null;
  return cat.funds
    .filter(f => f.isRepresentative)
    .sort((a, b) => (b.fundSizeMillionsUsd || 0) - (a.fundSizeMillionsUsd || 0))[0] || null;
};

const formatReturn = (value) => {
  if (value == null) return null;
  const sign = value >= 0 ? '+' : '';
  return {
    text: `${sign}${value.toFixed(2)}%`,
    className: value >= 0 ? 'positive' : 'negative',
  };
};

const Return3M = ({ value }) => {
  const r = formatReturn(value);
  if (!r) return <span className="sidebar-return-3m">-</span>;
  return <span className={`sidebar-return-3m ${r.className}`}>{r.text}</span>;
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
          {starredCategories.map(name => {
            const rep = getTopRep(data, name);
            return (
              <Link
                key={name}
                to={`/category/${encodeURIComponent(name)}`}
                className="sidebar-compact-link"
              >
                <span className="sidebar-compact-name">{name}</span>
                <Return3M value={rep?.return3M} />
              </Link>
            );
          })}
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
                className="sidebar-compact-link"
              >
                <span className="sidebar-compact-name">{fund.name}</span>
                <Return3M value={fund.return3M} />
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
