import { useEffect, useState } from 'react';
import { DateField } from '../../../shared/ui/DateField';
import { BUSINESS_STATUS_OPTIONS, STAFF_PAINT_OPTIONS } from './availabilityEditorUtils';

export function SelectRangeSheet({
  staffName,
  initialDay,
  businessOnly = false,
  openTime = '09:00',
  closeTime = '17:00',
  onClose,
  onApply
}) {
  const statusOptions = businessOnly ? BUSINESS_STATUS_OPTIONS : STAFF_PAINT_OPTIONS;
  const [status, setStatus] = useState(statusOptions[0]?.id || 'open');
  const [startDate, setStartDate] = useState(initialDay);
  const [endDate, setEndDate] = useState(initialDay);

  useEffect(() => {
    setStartDate(initialDay);
    setEndDate(initialDay);
    setStatus(statusOptions[0]?.id || 'open');
  }, [initialDay, businessOnly]);

  const datesValid = Boolean(startDate && endDate && endDate >= startDate);
  const canApply = datesValid;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bb-panel bb-schedule-avail-status-sheet bb-schedule-avail-select-range-sheet w-full max-w-md p-5 grid gap-4 max-h-[90vh] overflow-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avail-select-range-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bb-schedule-avail-status-sheet-head">
          <h2 id="avail-select-range-title" className="bb-page-title text-2xl m-0">
            Select range
          </h2>
          <p className="bb-schedule-avail-hint m-0">
            {businessOnly
              ? 'Choose dates and apply available or closed.'
              : `Apply a status across dates for ${staffName || 'this staff member'}.`}
          </p>
        </div>

        <div className="bb-schedule-avail-status" role="tablist" aria-label="Availability status">
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

        <div className="bb-schedule-avail-status-sheet-fields">
          <DateField
            label="Start date"
            value={startDate}
            onChange={(next) => {
              setStartDate(next);
              if (endDate && endDate < next) setEndDate(next);
            }}
          />
          <DateField
            label="End date"
            value={endDate}
            min={startDate || undefined}
            onChange={setEndDate}
          />
        </div>

        <p className="bb-schedule-avail-hint m-0">
          {businessOnly
            ? status === 'business-closed'
              ? 'Closed days override weekly open days for the whole business.'
              : 'Available clears closed dates in this range. Weekly open days still apply.'
            : status === 'leave'
              ? `Leave marks ${staffName || 'this staff member'} unavailable for the selected dates.`
              : status === 'off'
                ? `Off day marks ${staffName || 'this staff member'} as not working.`
                : 'Working days use business hours. Refine shifts per day on the calendar.'}
        </p>

        <div className="bb-schedule-avail-status-sheet-actions">
          <button type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="bb-primary-btn"
            disabled={!canApply}
            onClick={() => {
              if (!canApply) return;
              onApply?.({
                status,
                startDate,
                endDate,
                startTime: openTime,
                endTime: closeTime
              });
            }}
          >
            Apply range
          </button>
        </div>
      </div>
    </div>
  );
}
