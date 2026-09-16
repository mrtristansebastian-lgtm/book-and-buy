import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  buildMonthGrid,
  formatDisplayDate,
  parseDateKey,
  toDateKey
} from '../../utils/dates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function DateField({
  value = '',
  onChange,
  label = '',
  id,
  disabled = false,
  min = '',
  max = '',
  isDayDisabled,
  placeholder = 'Pick date',
  className = ''
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const [open, setOpen] = useState(false);
  const selected = useMemo(() => parseDateKey(value) || new Date(), [value]);
  const [draftDay, setDraftDay] = useState(() => value || toDateKey(new Date()));
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );
  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const todayKey = toDateKey(new Date());
  const display = value ? formatDisplayDate(value) : '';

  useEffect(() => {
    if (!open) return;
    const next = parseDateKey(value) || new Date();
    setDraftDay(value || toDateKey(next));
    setMonthAnchor(new Date(next.getFullYear(), next.getMonth(), 1));
  }, [open, value]);

  const isDisabledDay = (key) => {
    if (min && key < min) return true;
    if (max && key > max) return true;
    if (typeof isDayDisabled === 'function' && isDayDisabled(key)) return true;
    return false;
  };

  const confirm = () => {
    if (!draftDay || isDisabledDay(draftDay)) return;
    onChange?.(draftDay);
    setOpen(false);
  };

  return (
    <div
      className={`bb-date-field${className ? ` ${className}` : ''}${disabled ? ' is-disabled' : ''}`}
    >
      {label ? (
        <label className="bb-date-field-label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <div className="bb-date-field-control">
        <button
          id={fieldId}
          type="button"
          className="bb-date-field-value"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
        >
          <span className={display ? '' : 'is-placeholder'}>{display || placeholder}</span>
        </button>
        <button
          type="button"
          className="bb-date-field-pick"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
        >
          Pick
        </button>
      </div>

      {open ? (
        <div
          className="bb-date-picker-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="bb-panel bb-date-picker-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${fieldId}-title`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="bb-date-picker-head">
              <h2 id={`${fieldId}-title`} className="bb-date-picker-title">
                {label ? `Set ${label.toLowerCase()}` : 'Pick date'}
              </h2>
              <p className="bb-date-picker-hint">Choose a day from the calendar.</p>
            </header>

            <div className="bb-schedule-picker-month-nav">
              <button
                type="button"
                className="bb-ghost-btn px-3"
                aria-label="Previous month"
                onClick={() =>
                  setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1))
                }
              >
                <ChevronLeft size={18} />
              </button>
              <strong>
                {monthAnchor.toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
              </strong>
              <button
                type="button"
                className="bb-ghost-btn px-3"
                aria-label="Next month"
                onClick={() =>
                  setMonthAnchor((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1))
                }
              >
                <ChevronRight size={18} />
              </button>
            </div>

            <div className="bb-schedule-picker-weekdays" aria-hidden="true">
              {WEEKDAYS.map((day) => (
                <span key={day}>{day}</span>
              ))}
            </div>

            <div className="bb-schedule-picker-grid">
              {monthDays.map((date) => {
                const key = toDateKey(date);
                const inMonth = date.getMonth() === monthAnchor.getMonth();
                const isSelected = key === draftDay;
                const isToday = key === todayKey;
                const blocked = isDisabledDay(key);
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={blocked}
                    className={`bb-schedule-picker-day${isSelected ? ' is-selected' : ''}${
                      isToday ? ' is-today' : ''
                    }${inMonth ? '' : ' is-outside'}${blocked ? ' is-blocked' : ''}`}
                    onClick={() => {
                      if (!blocked) setDraftDay(key);
                    }}
                  >
                    {date.getDate()}
                  </button>
                );
              })}
            </div>

            <p className="bb-date-picker-summary">{formatDisplayDate(draftDay)}</p>

            <footer className="bb-date-picker-actions">
              <button
                type="button"
                className="bb-ghost-btn"
                onClick={() => {
                  const now = toDateKey(new Date());
                  if (!isDisabledDay(now)) {
                    setDraftDay(now);
                    setMonthAnchor(new Date());
                  }
                }}
              >
                Today
              </button>
              <div className="bb-date-picker-actions-end">
                <button type="button" className="bb-ghost-btn" onClick={() => setOpen(false)}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="bb-primary-btn"
                  disabled={!draftDay || isDisabledDay(draftDay)}
                  onClick={confirm}
                >
                  Confirm
                </button>
              </div>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
