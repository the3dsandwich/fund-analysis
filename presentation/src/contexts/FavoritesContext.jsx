import { createContext, useContext, useState, useEffect, useCallback } from 'react';

const FavoritesContext = createContext(null);
const STORAGE_KEY = 'fund-analysis-favorites';

const loadFromStorage = () => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        categories: new Set(parsed.categories || []),
        funds: new Set(parsed.funds || []),
      };
    }
  } catch {
    // ignore corrupt data
  }
  return { categories: new Set(), funds: new Set() };
};

const saveToStorage = (favorites) => {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    categories: [...favorites.categories],
    funds: [...favorites.funds],
  }));
};

export const useFavorites = () => {
  const ctx = useContext(FavoritesContext);
  if (!ctx) throw new Error('useFavorites must be used within FavoritesProvider');
  return ctx;
};

export const FavoritesProvider = ({ children }) => {
  const [favorites, setFavorites] = useState(loadFromStorage);

  useEffect(() => {
    saveToStorage(favorites);
  }, [favorites]);

  const toggleCategory = useCallback((name) => {
    setFavorites(prev => {
      const next = { categories: new Set(prev.categories), funds: new Set(prev.funds) };
      if (next.categories.has(name)) {
        next.categories.delete(name);
      } else {
        next.categories.add(name);
      }
      return next;
    });
  }, []);

  const toggleFund = useCallback((id) => {
    setFavorites(prev => {
      const next = { categories: new Set(prev.categories), funds: new Set(prev.funds) };
      if (next.funds.has(id)) {
        next.funds.delete(id);
      } else {
        next.funds.add(id);
      }
      return next;
    });
  }, []);

  const isCategoryStarred = useCallback((name) => favorites.categories.has(name), [favorites]);
  const isFundStarred = useCallback((id) => favorites.funds.has(id), [favorites]);

  const value = {
    toggleCategory,
    toggleFund,
    isCategoryStarred,
    isFundStarred,
    starredCategories: [...favorites.categories],
    starredFunds: [...favorites.funds],
  };

  return (
    <FavoritesContext.Provider value={value}>
      {children}
    </FavoritesContext.Provider>
  );
};
