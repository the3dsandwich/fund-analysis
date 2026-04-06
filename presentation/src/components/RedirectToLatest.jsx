import { Navigate } from 'react-router-dom';
import { useData } from '../contexts/DataContext';
import LoadingState from './LoadingState';

const RedirectToLatest = () => {
  const { manifest, error } = useData();
  if (error) return <LoadingState error={error} />;
  if (!manifest) return <LoadingState />;
  if (!manifest.latest) return <LoadingState error="No snapshots available." />;
  return <Navigate replace to={`/${manifest.latest}`} />;
};

export default RedirectToLatest;
