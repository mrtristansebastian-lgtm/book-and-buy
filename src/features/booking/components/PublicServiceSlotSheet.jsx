import { useEffect, useMemo, useState } from 'react';
import { DateField } from '../../../shared/ui/DateField';
import { getDaySlots, getMaxBookableDateKey } from '../../../utils/availability';
import { formatDisplayDate, toDateKey } from '../../../utils/dates';
import { getServiceDurationMinutes } from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';

function buildSlotQuery(service, workspace, bookings, dateKey) {
  const services = workspace.services || [];
  return {
    dateKey,
    bookings: bookings || [],
    serviceId: service?.id,
    openTime: workspace.availabilityRules?.businessOpenTime,
    closeTime: workspace.availabilityRules?.businessCloseTime,
    availabilityRules: workspace.availabilityRules,
    services,
    staff: workspace.staff || [],
    staffAvailability: workspace.staffAvailability,
    durationMinutes: service ? getServiceDurationMinutes(service) : undefined
  };
}

/**
 * Public booking slot sheet — DateField calendar + available time chips only.
 */
export function PublicServiceSlotSheet({
  open = false,
  service = null,
  workspace = {},
  bookings = [],
  initialDateKey = '',
  initialTime = '',
  confirmLabel = 'Add to cart',
  onClose,
  onConfirm
}) {
  const todayKey = toDateKey(new Date());
  const maxBookableDateKey = useMemo(
    () => getMaxBookableDateKey(workspace.availabilityRules, todayKey),
    [workspace.availabilityRules, todayKey]
  );
  const [dateKey, setDateKey] = useState(initialDateKey || '');
  const [time, setTime] = useState(initialTime || '');

  useEffect(() => {
    if (!open) return;
    setDateKey(initialDateKey || '');
    setTime(initialTime || '');
  }, [open, initialDateKey, initialTime, service?.id]);

  const isSpot = Boolean(service) && getServiceScheduleType(service) === 'class_session';

  const slots = useMemo(() => {
    if (!open || !service || isSpot || !dateKey) return [];
    return getDaySlots(buildSlotQuery(service, workspace, bookings, dateKey)).filter(
      (slot) => slot.available !== false
    );
  }, [open, service, isSpot, dateKey, workspace, bookings]);

  const isDayDisabled = (key) => {
    if (!service || isSpot) return true;
    if (key < todayKey) return true;
    if (maxBookableDateKey && key > maxBookableDateKey) return true;
    return getDaySlots(buildSlotQuery(service, workspace, bookings, key)).length === 0;
  };

  if (!open || !service) return null;

  if (isSpot) {
    return (
      <div
        className="bb-public-slot-sheet-backdrop"
        role="presentation"
        onClick={onClose}
      >
        <div
          className="bb-panel bb-public-slot-sheet"
          role="dialog"
          aria-modal="true"
          aria-labelledby="bb-public-slot-sheet-title"
          onClick={(event) => event.stopPropagation()}
        >
          <header className="bb-public-slot-sheet-head">
            <h2 id="bb-public-slot-sheet-title" className="bb-public-slot-sheet-title">
              Fixed session
            </h2>
            <p className="bb-public-slot-sheet-lede">
              {service.name} uses a set programme window — no date picker needed.
            </p>
          </header>
          <footer className="bb-public-slot-sheet-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              onClick={() => {
                onConfirm?.({
                  dateKey: service.sessionStartDate || '',
                  time: service.sessionStartTime || ''
                });
              }}
            >
              {confirmLabel}
            </button>
          </footer>
        </div>
      </div>
    );
  }

  const canConfirm = Boolean(dateKey && time && slots.some((slot) => slot.time === time));

  return (
    <div className="bb-public-slot-sheet-backdrop" role="presentation" onClick={onClose}>
      <div
        className="bb-panel bb-public-slot-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bb-public-slot-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bb-public-slot-sheet-head">
          <h2 id="bb-public-slot-sheet-title" className="bb-public-slot-sheet-title">
            Choose date & time
          </h2>
          <p className="bb-public-slot-sheet-lede">
            Pick an available slot for {service.name} before adding it to your cart.
          </p>
        </header>

        <DateField
          label="Date"
          value={dateKey}
          min={todayKey}
          max={maxBookableDateKey || ''}
          isDayDisabled={isDayDisabled}
          placeholder="Pick an available day"
          onChange={(next) => {
            setDateKey(next);
            setTime('');
          }}
        />

        <div className="bb-public-slot-sheet-times">
          <p className="bb-public-slot-sheet-times-label">Available times</p>
          {!dateKey ? (
            <p className="bb-muted m-0 text-sm">Select a date to see open times.</p>
          ) : slots.length === 0 ? (
            <p className="bb-muted m-0 text-sm">No open slots on this day.</p>
          ) : (
            <div className="bb-public-slot-sheet-chips">
              {slots.map((slot) => (
                <button
                  key={slot.time}
                  type="button"
                  className={
                    time === slot.time
                      ? 'bb-public-slot-chip is-selected'
                      : 'bb-public-slot-chip'
                  }
                  onClick={() => setTime(slot.time)}
                >
                  {slot.time}
                </button>
              ))}
            </div>
          )}
        </div>

        {dateKey && time ? (
          <p className="bb-public-slot-sheet-summary">
            {formatDisplayDate(dateKey)} · {time}
          </p>
        ) : null}

        <footer className="bb-public-slot-sheet-actions">
          <button type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="bb-primary-btn"
            disabled={!canConfirm}
            onClick={() => {
              if (!canConfirm) return;
              onConfirm?.({ dateKey, time });
            }}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
