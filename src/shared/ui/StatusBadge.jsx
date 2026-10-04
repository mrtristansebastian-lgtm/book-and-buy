import { forwardRef } from 'react';
import { getStatusPresentation } from './controlStatus';

/** Non-interactive status label; wording is supplied by the owning domain. */
export const StatusBadge = forwardRef(function StatusBadge({
  status = 'unknown',
  label,
  children,
  className = '',
  ...props
}, ref) {
  const presentation = getStatusPresentation(status);
  return (
    <span
      {...props}
      ref={ref}
      className={`bb-status-badge${className ? ` ${className}` : ''}`}
      data-status={presentation.status}
      data-tone={presentation.tone}
    >
      {presentation.showCheck && (
        <svg className="bb-status-check" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
          <path d="m5 12 4 4L19 6" />
        </svg>
      )}
      <span>{label ?? children ?? String(status).replace(/[_-]+/g, ' ')}</span>
    </span>
  );
});
