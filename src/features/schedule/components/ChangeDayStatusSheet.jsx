import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
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
          <Button action="cancel" variant="secondary" type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </Button>
          <Button action="save" variant="primary"
            type="button"
            className="bb-primary-btn"
            onClick={() => {
              onApply?.(status);
              onClose?.();
            }}
          >
            Save {activeLabel.toLowerCase()}
          </Button>
        </div>
      }
    >
      <div className="bb-schedule-avail-status" role="tablist" aria-label="Day status">
        {statusOptions.map((option) => (
          <FilterChip
            key={option.id}
            type="button"
            role="tab"
            aria-selected={status === option.id}
            selected={status === option.id}
            className={`bb-schedule-avail-status-btn is-paint is-${option.id}${
              status === option.id ? ' is-active' : ''
            }`}
            onClick={() => setStatus(option.id)}
          >
            {option.label}
          </FilterChip>
        ))}
      </div>
    </AppSheet>
  );
}
