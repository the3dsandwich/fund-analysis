import { useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import LoadingState from './LoadingState';

const DateGate = ({ children }) => {
  const { date: urlDate } = useParams();
  const { date, setDate, data, loading, error } = useData();

  useEffect(() => {
    if (urlDate && urlDate !== date) setDate(urlDate);
  }, [urlDate, date, setDate]);

  if (error) return <LoadingState error={error} />;
  if (loading || !data || date !== urlDate) {
    return <LoadingState message={`Loading data for ${urlDate}...`} />;
  }
  return children;
};

export default DateGate;
