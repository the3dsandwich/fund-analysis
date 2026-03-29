const LoadingState = ({ message = 'Loading...', error = null }) => {
  if (error) {
    return <div className="loading-state error-state">{error}</div>;
  }
  return <div className="loading-state">{message}</div>;
};

export default LoadingState;
