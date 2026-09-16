import { useEffect, useMemo, useState } from 'react';
import { DateField } from '../../../shared/ui/DateField';
import { getDaySlots, getMaxBookableDateKey } from '../../../utils/availability';
import { formatDisplayDate, toDateKey } from '../../../utils/dates';
import {
  findServiceVariant,
  formatServicePrice,
  getServiceActiveVariants,
  getServiceDurationMinutes,
  serviceHasVariants
} from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';

function buildSlotQuery(service, workspace, bookings, dateKey, variant) {
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
    durationMinutes: service
      ? getServiceDurationMinutes(service, variant)
      : undefined
  };
}

/**
 * Public booking slot sheet — optional variant pick + DateField + time chips.
 */
export function PublicServiceSlotSheet({
  open = false,
  service = null,
  workspace = {},
  bookings = [],
  initialDateKey = '',
  initialTime = '',
  initialVariantId = '',
  confirmLabel = 'Add to cart',
  onClose,
  onConfirm
}) {
  const todayKey = toDateKey(new Date());
  const maxBookableDateKey = useMemo(
    () => getMaxBookableDateKey(workspace.availabilityRules, todayKey),
    [workspace.availabilityRules, todayKey]
  );
  const variants = useMemo(
    () => (service ? getServiceActiveVariants(service) : []),
    [service]
  );
  const needsVariant = Boolean(service) && serviceHasVariants(service);
  const [dateKey, setDateKey] = useState(initialDateKey || '');
  const [time, setTime] = useState(initialTime || '');
  const [variantId, setVariantId] = useState(initialVariantId || '');

  useEffect(() => {
    if (!open) return;
    setDateKey(initialDateKey || '');
    setTime(initialTime || '');
    const preferred =
      initialVariantId ||
      (needsVariant ? variants[0]?.id || '' : '');
    setVariantId(preferred);
  }, [open, initialDateKey, initialTime, initialVariantId, service?.id, needsVariant, variants]);

  const selectedVariant = useMemo(() => {
    if (!service || !variantId) return null;
    return findServiceVariant(service, variantId);
  }, [service, variantId]);

  const isSpot = Boolean(service) && getServiceScheduleType(service) === 'class_session';

  const slots = useMemo(() => {
    if (!open || !service || isSpot || !dateKey) return [];
    if (needsVariant && !selectedVariant) return [];
    return getDaySlots(
      buildSlotQuery(service, workspace, bookings, dateKey, selectedVariant)
    ).filter((slot) => slot.available !== false);
  }, [
    open,
    service,
    isSpot,
    dateKey,
    workspace,
    bookings,
    needsVariant,
    selectedVariant
  ]);

  const isDayDisabled = (key) => {
    if (!service || isSpot) return true;
    if (needsVariant && !selectedVariant) return true;
    if (key < todayKey) return true;
    if (maxBookableDateKey && key > maxBookableDateKey) return true;
    return (
      getDaySlots(
        buildSlotQuery(service, workspace, bookings, key, selectedVariant)
      ).length === 0
    );
  };

  if (!open || !service) return null;

  const variantPicker =
    needsVariant && variants.length ? (
      <div className="bb-public-service-variants">
        <p className="bb-public-slot-sheet-times-label">Choose option</p>
        <div className="bb-public-service-variant-list">
          {variants.map((variant) => {
            const active = variantId === variant.id;
            const price = formatServicePrice(service, variant);
            const mins = getServiceDurationMinutes(service, variant);
            return (
              <button
                key={variant.id}
                type="button"
                className={`bb-public-service-variant${active ? ' is-active' : ''}`}
                onClick={() => {
                  setVariantId(variant.id);
                  setTime('');
                }}
              >
                <span className="bb-public-service-variant-name">{variant.name}</span>
                {variant.description ? (
                  <span className="bb-public-service-variant-desc">
                    {variant.description}
                  </span>
                ) : null}
                <span className="bb-public-service-variant-meta">
                  {[price || null, mins ? `${mins} min` : null]
                    .filter(Boolean)
                    .join(' · ')}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    ) : null;

  if (isSpot) {
    const canConfirmSpot = !needsVariant || Boolean(selectedVariant);
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
          {variantPicker}
          <footer className="bb-public-slot-sheet-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              disabled={!canConfirmSpot}
              onClick={() => {
                if (!canConfirmSpot) return;
                onConfirm?.({
                  dateKey: service.sessionStartDate || '',
                  time: service.sessionStartTime || '',
                  variant: selectedVariant
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

  const canConfirm =
    Boolean(dateKey && time && slots.some((slot) => slot.time === time)) &&
    (!needsVariant || Boolean(selectedVariant));

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

        {variantPicker}

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
          {needsVariant && !selectedVariant ? (
            <p className="bb-muted m-0 text-sm">Choose an option first.</p>
          ) : !dateKey ? (
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
              onConfirm?.({ dateKey, time, variant: selectedVariant });
            }}
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
