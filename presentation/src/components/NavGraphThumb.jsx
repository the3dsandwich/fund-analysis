import { useState, useEffect } from 'react';

const NavGraphThumb = ({ base64, alt }) => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open]);

  const handleThumbClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(true);
  };

  const handleBackdropClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setOpen(false);
  };

  const src = `data:image/png;base64,${base64}`;

  return (
    <>
      <img
        className="nav-graph-thumb"
        src={src}
        alt={alt}
        onClick={handleThumbClick}
      />
      {open && (
        <div
          className="nav-graph-modal-backdrop"
          role="dialog"
          aria-label={alt}
          onClick={handleBackdropClick}
        >
          <img className="nav-graph-modal-image" src={src} alt={alt} />
        </div>
      )}
    </>
  );
};

export default NavGraphThumb;
