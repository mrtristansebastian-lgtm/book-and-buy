import { useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { buildMonthGrid, formatDisplayDate, toDateKey } from '../../../utils/dates';
import { WEEKDAY_KEYS } from '../../../utils/staffAvailability';

const WEEKDAY_LABELS = Object.freeze({
  mon: 'Mo',
  tue: 'Tu',
  wed: 'We',
  thu: 'Th',
  fri: 'Fr',
  sat: 'Sa',
  sun: 'Su'
});

const STATUS_LABELS = Object.freeze({
  open: 'Working',
  break: 'Working with a break',
  off: 'Off day',
  leave: 'Leave',
  'business-closed': 'Business closed'
});

/** Shared, controlled availability calendar used by Availability and Schedule. */
export function AvailabilityMonthGrid({
  monthAnchor,
  selectedDay,
  onSelectDay,
  onPreviousMonth,
  onNextMonth,
  canGoPrevious = true,
  canGoNext = true,
  resolveStatus = () => 'open',
  isDateEnabled = () => true,
  hasIndicator = () => false,
  activeEdit = false,
  className = ''
}) {
  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const todayKey = toDateKey(new Date());

  return (
    <div className={`bb-availability-month-grid${className ? ` ${className}` : ''}`}>
      <div className="bb-schedule-picker-month-nav bb-schedule-mini-head">
        <strong>
          {monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
        </strong>
        <div>
          <button
            type="button"
            className="bb-ghost-btn px-3"
            aria-label="Previous month"
            disabled={!canGoPrevious}
            onClick={onPreviousMonth}
          >
            <ChevronLeft size={15} />
          </button>
          <button
            type="button"
            className="bb-ghost-btn px-3"
            aria-label="Next month"
            disabled={!canGoNext}
            onClick={onNextMonth}
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      <div className="bb-schedule-picker-weekdays bb-schedule-mini-weekdays" aria-hidden="true">
        {WEEKDAY_KEYS.map((key) => <span key={key}>{WEEKDAY_LABELS[key]}</span>)}
      </div>

      <div className={`bb-schedule-picker-grid bb-schedule-mini-grid${activeEdit ? ' is-painting' : ''}`}>
        {monthDays.map((date) => {
          const key = toDateKey(date);
          const inMonth = date.getMonth() === monthAnchor.getMonth();
          const enabled = isDateEnabled(key);
          const status = resolveStatus(key) || 'open';
          // A partial break is still a working day in the month view.
          const displayStatus = status === 'break' ? 'open' : status;
          const selected = key === selectedDay;
          const indicator = hasIndicator(key);
          return (
            <button
              key={key}
              type="button"
              className={`bb-schedule-picker-day is-${displayStatus}${
                selected ? ' is-selected' : ''
              }${inMonth ? '' : ' is-outside'}${enabled ? '' : ' is-outside-window'}${
                activeEdit && enabled ? ' is-paintable' : ''
              }${key === todayKey ? ' is-today' : ''}${indicator ? ' has-booking' : ''}`}
              aria-label={`${formatDisplayDate(key)}, ${STATUS_LABELS[status] || status}${
                indicator ? ', has confirmed bookings' : ''
              }`}
              aria-pressed={selected}
              disabled={activeEdit && !enabled}
              onClick={() => onSelectDay?.(key, date)}
            >
              {date.getDate()}
            </button>
          );
        })}
      </div>
    </div>
  );
}
