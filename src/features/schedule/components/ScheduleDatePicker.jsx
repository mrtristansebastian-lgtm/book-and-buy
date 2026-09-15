import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import {
  buildMonthGrid,
  formatDisplayDate,
  parseDateKey,
  toDateKey
} from '../../../utils/dates';
import { WEEKDAYS } from '../pages/schedulePageUtils';

export function ScheduleDatePicker({ day, onApply, onClose }) {
  const selected = parseDateKey(day) || new Date();
  const [draftDay, setDraftDay] = useState(() => toDateKey(selected));
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );
  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const todayKey = toDateKey(new Date());

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Pick day"
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-schedule-picker-sheet">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Calendar</p>
            <h2 className="bb-services-sheet-title">Pick day</h2>
            <p className="bb-services-sheet-lede">Jump to a date.</p>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-services-sheet-body bb-schedule-picker-body">
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
            {WEEKDAYS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>

          <div className="bb-schedule-picker-grid">
            {monthDays.map((date) => {
              const key = toDateKey(date);
              const inMonth = date.getMonth() === monthAnchor.getMonth();
              const isSelected = key === draftDay;
              const isToday = key === todayKey;
              return (
                <button
                  key={key}
                  type="button"
                  className={`bb-schedule-picker-day${isSelected ? ' is-selected' : ''}${
                    isToday ? ' is-today' : ''
                  }${inMonth ? '' : ' is-outside'}`}
                  onClick={() => setDraftDay(key)}
                >
                  {date.getDate()}
                </button>
              );
            })}
          </div>

          <p className="bb-schedule-picker-summary">{formatDisplayDate(draftDay)}</p>
        </div>

        <footer className="bb-services-sheet-footer">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              const now = toDateKey(new Date());
              setDraftDay(now);
              setMonthAnchor(new Date());
            }}
          >
            Today
          </button>
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="bb-primary-btn" onClick={() => onApply?.({ day: draftDay })}>
              Apply
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
