import { useEffect, useMemo, useState } from 'react';
import { AppSheet } from '../../../shared/ui/AppSheet';
import { AvailabilityMonthGrid } from './AvailabilityMonthGrid';
import { formatDisplayDate, parseDateKey, toDateKey } from '../../../utils/dates';
import { getMaxBookableDateKey, isDateWithinAdvanceWindow } from '../../../utils/availability';
import { clampMonthAnchor, sameMonth, formatWindowDate } from './availabilityEditorUtils';

export function ApplyShiftDatesSheet({
  initialDay,
  shift,
  availabilityRules = {},
  resolveStatus,
  onClose,
  onApply
}) {
  const todayKey = toDateKey(new Date());
  const maxBookableDateKey = useMemo(
    () => getMaxBookableDateKey(availabilityRules, todayKey),
    [availabilityRules, todayKey]
  );
  const [selectedDays, setSelectedDays] = useState(() => (initialDay ? [initialDay] : []));
  const [monthAnchor, setMonthAnchor] = useState(() => {
    const date = parseDateKey(initialDay) || new Date();
    return clampMonthAnchor(new Date(date.getFullYear(), date.getMonth(), 1), todayKey, maxBookableDateKey);
  });

  useEffect(() => {
    const date = parseDateKey(initialDay) || new Date();
    setSelectedDays(initialDay ? [initialDay] : []);
    setMonthAnchor(clampMonthAnchor(new Date(date.getFullYear(), date.getMonth(), 1), todayKey, maxBookableDateKey));
  }, [initialDay, maxBookableDateKey, todayKey]);

  const canGoPrevious = useMemo(() => {
    const today = parseDateKey(todayKey) || new Date();
    return !sameMonth(monthAnchor, today);
  }, [monthAnchor, todayKey]);
  const canGoNext = useMemo(() => {
    if (!maxBookableDateKey) return true;
    const nextMonthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
    return toDateKey(nextMonthStart) <= maxBookableDateKey;
  }, [monthAnchor, maxBookableDateKey]);

  const toggleDay = (key) => {
    if (!isDateWithinAdvanceWindow(key, availabilityRules, { todayKey })) return;
    setSelectedDays((previous) =>
      previous.includes(key) ? previous.filter((day) => day !== key) : [...previous, key].sort()
    );
  };

  const shiftLabel = shift?.start && shift?.end ? `${shift.start} – ${shift.end}` : 'Selected shift';
  const windowLabel = maxBookableDateKey
    ? `${formatWindowDate(todayKey)} – ${formatWindowDate(maxBookableDateKey)}`
    : 'No end date configured';

  return (
    <AppSheet
      onClose={onClose}
      eyebrow="Availability"
      title="Apply shift to days"
      lede={`Choose one or more dates for the ${shiftLabel} shift. Booking dates are limited to ${windowLabel}.`}
      labelledBy="apply-shift-dates-title"
      panelClassName="bb-schedule-avail-sheet-panel bb-schedule-apply-shift-panel"
      footer={
        <div className="bb-services-sheet-footer-actions">
          <button type="button" className="bb-ghost-btn" onClick={onClose}>Cancel</button>
          <button
            type="button"
            className="bb-primary-btn"
            disabled={!selectedDays.length}
            onClick={() => onApply?.({ dates: selectedDays, shift })}
          >
            Apply to {selectedDays.length || 0} {selectedDays.length === 1 ? 'day' : 'days'}
          </button>
        </div>
      }
    >
      <div className="bb-schedule-apply-shift-summary">
        <span className="bb-schedule-avail-day-feed-tag">Shift</span>
        <strong>{shiftLabel}</strong>
        <span>{selectedDays.length ? `${selectedDays.length} selected` : 'Select dates below'}</span>
      </div>
      <AvailabilityMonthGrid
        monthAnchor={monthAnchor}
        selectedDay=""
        selectedDays={selectedDays}
        multiSelect
        activeEdit
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        resolveStatus={(key) => resolveStatus?.(key) || 'open'}
        isDateEnabled={(key) => isDateWithinAdvanceWindow(key, availabilityRules, { todayKey })}
        onPreviousMonth={() => setMonthAnchor((previous) => clampMonthAnchor(new Date(previous.getFullYear(), previous.getMonth() - 1, 1), todayKey, maxBookableDateKey))}
        onNextMonth={() => setMonthAnchor((previous) => clampMonthAnchor(new Date(previous.getFullYear(), previous.getMonth() + 1, 1), todayKey, maxBookableDateKey))}
        onSelectDay={(key) => toggleDay(key)}
        className="bb-schedule-apply-shift-calendar"
      />
      <p className="bb-schedule-avail-hint m-0">
        {selectedDays.length
          ? `Selected ${selectedDays.map((day) => formatDisplayDate(day)).join(', ')}.`
          : 'Select at least one date. Dates outside the booking period are unavailable.'}
      </p>
    </AppSheet>
  );
}
