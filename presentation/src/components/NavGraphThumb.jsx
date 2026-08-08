import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';

const DEFAULT_CLOSE_MS = 150; // fallback if --duration-quick can't be read (matches its value)

const NavGraphThumb = ({ base64, alt }) => {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);
  const closeTimer = useRef(null);
  const isClosing = useRef(false);

  const closeModal = () => {
    if (isClosing.current) return;
    isClosing.current = true;
    setClosing(true);

    const dur = parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue('--duration-quick'),
    ) || DEFAULT_CLOSE_MS;

    closeTimer.current = setTimeout(() => {
      setVisible(false);
      setClosing(false);
      isClosing.current = false;
    }, dur);
  };

  const openModal = () => {
    clearTimeout(closeTimer.current);
    isClosing.current = false;
    setClosing(false);
    setVisible(true);
  };

  useEffect(() => {
    if (!visible) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') closeModal();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  useEffect(() => () => clearTimeout(closeTimer.current), []);

  const handleThumbClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    openModal();
  };

  const handleBackdropClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    closeModal();
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
      {visible &&
        createPortal(
          // Portalled to <body> deliberately: this thumbnail can be rendered
          // inside a card that gets `transform` on :hover (the hover-lift),
          // and a `transform` on any ancestor turns it into the containing
          // block for `position: fixed` descendants — which would shrink
          // this backdrop down to the card's box instead of the viewport.
          // Rendering outside the card entirely sidesteps that.
          <div
            className={`nav-graph-modal-backdrop${closing ? ' is-closing' : ''}`}
            role="dialog"
            aria-label={alt}
            onClick={handleBackdropClick}
          >
            <img className="nav-graph-modal-image" src={src} alt={alt} />
          </div>,
          document.body,
        )}
    </>
  );
};

export default NavGraphThumb;
