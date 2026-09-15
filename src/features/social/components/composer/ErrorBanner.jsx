import { AlertTriangle, X } from 'lucide-react';

export function ErrorBanner({ message, skips, onDismiss }) {
  if (!message && !skips?.length) return null;
  return (
    <div className="bb-composer-banner" role="alert" aria-live="assertive">
      <span className="bb-composer-banner-icon" aria-hidden="true">
        <AlertTriangle size={15} strokeWidth={2.3} />
      </span>
      <div className="bb-composer-banner-copy">
        {message ? <p className="bb-composer-banner-title">{message}</p> : null}
        {skips?.length ? (
          <ul className="bb-composer-banner-list">
            {skips.map((entry) => (
              <li key={`${entry.name}-${entry.reason}`}>
                <strong>{entry.name}</strong> — {entry.reason}
              </li>
            ))}
          </ul>
        ) : null}
      </div>
      <button
        type="button"
        className="bb-composer-banner-close"
        aria-label="Dismiss"
        onClick={onDismiss}
      >
        <X size={14} />
      </button>
    </div>
  );
}
