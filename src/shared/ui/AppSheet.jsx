import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

/**
 * Universal modal shell — portals to document.body so overlays never clip
 * inside transformed / overflowing parents. Uses the shared bb-services-sheet
 * layout used across Studios.
 */
export function AppSheet({
  onClose,
  title,
  eyebrow = '',
  lede = '',
  children,
  footer = null,
  panelClassName = '',
  bodyClassName = '',
  labelledBy,
  ariaLabel,
  showClose = true
}) {
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (event) => {
      if (event.key === 'Escape') onClose?.();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="bb-services-sheet bb-app-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={ariaLabel || title}
      aria-labelledby={labelledBy}
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className={`bb-services-sheet-panel${panelClassName ? ` ${panelClassName}` : ''}`}>
        <header className="bb-services-sheet-head">
          <div>
            {eyebrow ? <p className="bb-services-sheet-eyebrow">{eyebrow}</p> : null}
            {title ? (
              <h2 id={labelledBy} className="bb-services-sheet-title">
                {title}
              </h2>
            ) : null}
            {lede ? <p className="bb-services-sheet-lede">{lede}</p> : null}
          </div>
          {showClose ? (
            <button
              type="button"
              className="bb-ghost-btn bb-services-sheet-close"
              aria-label="Close"
              onClick={onClose}
            >
              <X size={18} />
            </button>
          ) : null}
        </header>
        <div className={`bb-services-sheet-body${bodyClassName ? ` ${bodyClassName}` : ''}`}>
          {children}
        </div>
        {footer ? <footer className="bb-services-sheet-footer">{footer}</footer> : null}
      </div>
    </div>,
    document.body
  );
}
