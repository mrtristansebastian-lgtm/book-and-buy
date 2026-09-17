import { useEffect, useMemo, useState } from 'react';
import { AppSheet } from '../../../shared/ui/AppSheet';
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

  useEffect(() => {
    setStatus(
      statusOptions.some((option) => option.id === currentStatus)
        ? currentStatus
        : statusOptions[0]?.id || 'open'
    );
  }, [currentStatus, businessOnly]);

  const activeLabel = useMemo(
    () => statusOptions.find((option) => option.id === status)?.label || 'Status',
    [statusOptions, status]
  );

  return (
    <AppSheet
      onClose={onClose}
      eyebrow="Availability"
      title="Change status"
      lede={businessOnly ? 'Set this business day, then save.' : 'Set this staff day, then save.'}
      labelledBy="avail-change-status-title"
      panelClassName="bb-schedule-avail-sheet-panel is-compact"
      footer={
        <div className="bb-services-sheet-footer-actions">
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
            Save {activeLabel.toLowerCase()}
          </button>
        </div>
      }
    >
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
    </AppSheet>
  );
}
