import { useState } from 'react';
import { BUSINESS_STATUS_OPTIONS, STATUS_OPTIONS } from './availabilityEditorUtils';

export function ChangeDayStatusSheet({
  businessOnly = false,
  currentStatus = 'open',
  onClose,
  onApply
}) {
  const statusOptions = businessOnly ? BUSINESS_STATUS_OPTIONS : STATUS_OPTIONS;
  const [status, setStatus] = useState(
    statusOptions.some((option) => option.id === currentStatus)
      ? currentStatus
      : statusOptions[0]?.id || 'open'
  );

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bb-panel bb-schedule-avail-status-sheet bb-schedule-avail-change-status-sheet w-full max-w-sm p-5 grid gap-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avail-change-status-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bb-schedule-avail-status-sheet-head">
          <h2 id="avail-change-status-title" className="bb-page-title text-2xl m-0">
            Change status
          </h2>
          <p className="bb-schedule-avail-hint m-0">
            {businessOnly ? 'Set this business day.' : 'Set this staff day.'}
          </p>
        </div>

        <div className="bb-schedule-avail-status" role="tablist" aria-label="Day status">
          {statusOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={status === option.id}
              className={`bb-schedule-avail-status-btn is-paint is-${option.id}${
                status === option.id ? ' is-active' : ''
              }`}
              onClick={() => setStatus(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="bb-schedule-avail-status-sheet-actions">
          <button type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="bb-primary-btn"
            onClick={() => {
              onApply?.(status);
              onClose?.();
            }}
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
