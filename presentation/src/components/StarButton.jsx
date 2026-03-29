const StarButton = ({ starred, onClick }) => {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };

  return (
    <button
      className={`star-btn${starred ? ' star-btn-active' : ''}`}
      onClick={handleClick}
      aria-label={starred ? 'Remove from favorites' : 'Add to favorites'}
    >
      {starred ? '\u2605' : '\u2606'}
    </button>
  );
};

export default StarButton;
