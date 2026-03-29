import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react';

const DataContext = createContext(null);

export const useData = () => {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
};

export const DataProvider = ({ children }) => {
  const [manifest, setManifest] = useState(null);
  const [date, setDateState] = useState(null);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const cache = useRef({});

  // Fetch manifest on mount
  useEffect(() => {
    fetch('/snapshots/manifest.json')
      .then(res => {
        if (!res.ok) throw new Error('Data is not available yet. The first refresh may still be running.');
        return res.json();
      })
      .then(m => {
        setManifest(m);
        if (m.latest) {
          setDateState(m.latest);
        } else {
          setLoading(false);
          setError('No snapshots available.');
        }
      })
      .catch(err => {
        setLoading(false);
        setError(err.message || 'Failed to load manifest.');
      });
  }, []);

  // Fetch snapshot when date changes
  useEffect(() => {
    if (!date) return;

    if (cache.current[date]) {
      setData(cache.current[date]);
      setLoading(false);
      return;
    }

    setLoading(true);
    fetch(`/snapshots/${date}.json`)
      .then(res => {
        if (!res.ok) throw new Error(`Failed to load data for ${date}.`);
        return res.json();
      })
      .then(d => {
        cache.current[date] = d;
        setData(d);
        setLoading(false);
        setError(null);
      })
      .catch(err => {
        setLoading(false);
        setError(err.message);
      });
  }, [date]);

  const setDate = useCallback((newDate) => {
    setDateState(newDate);
  }, []);

  return (
    <DataContext.Provider value={{ data, date, setDate, manifest, loading, error }}>
      {children}
    </DataContext.Provider>
  );
};
