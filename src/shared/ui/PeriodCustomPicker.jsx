import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  buildMonthGrid,
  formatDisplayDate,
  parseDateKey,
  toDateKey
} from '../../utils/dates';

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function orderedKeys(a, b) {
  if (!a) return { start: b || '', end: b || '' };
  if (!b) return { start: a, end: a };
  return a <= b ? { start: a, end: b } : { start: b, end: a };
}

/**
 * Universal calendar sheet for Custom period — pick one day or a start→end range.
 */
export function PeriodCustomPicker({
  open = false,
  from = '',
  to = '',
  onClose,
  onApply
}) {
  const seed = from || toDateKey(new Date());
  const [draftStart, setDraftStart] = useState(seed);
  const [draftEnd, setDraftEnd] = useState(to || seed);
  const [pickingEnd, setPickingEnd] = useState(false);
  const selected = parseDateKey(draftStart) || new Date();
  const [monthAnchor, setMonthAnchor] = useState(
    () => new Date(selected.getFullYear(), selected.getMonth(), 1)
  );
  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const todayKey = toDateKey(new Date());
  const span = orderedKeys(draftStart, draftEnd);

  useEffect(() => {
    if (!open) return;
    const nextFrom = from || toDateKey(new Date());
    const nextTo = to || nextFrom;
    setDraftStart(nextFrom);
    setDraftEnd(nextTo);
    setPickingEnd(false);
    const date = parseDateKey(nextFrom) || new Date();
    setMonthAnchor(new Date(date.getFullYear(), date.getMonth(), 1));
  }, [open, from, to]);

  if (!open) return null;

  const summary =
    span.start && span.end && span.start !== span.end
      ? `${formatDisplayDate(span.start)} – ${formatDisplayDate(span.end)}`
      : formatDisplayDate(span.start || draftStart);

  return (
    <div
      className="bb-date-picker-backdrop"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bb-panel bb-date-picker-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="period-custom-picker-title"
        onClick={(event) => event.stopPropagation()}
      >
        <header className="bb-date-picker-head">
          <h2 id="period-custom-picker-title" className="bb-date-picker-title">
            Custom period
          </h2>
          <p className="bb-date-picker-hint">
            {pickingEnd
              ? 'Now tap the end day. Same day is fine for a single date.'
              : 'Tap a start day, then an end day — or the same day once more.'}
          </p>
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
            const inRange = span.start && span.end && key >= span.start && key <= span.end;
            const isEdge = key === span.start || key === span.end;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                className={`bb-schedule-picker-day${isEdge ? ' is-selected' : ''}${
                  inRange && !isEdge ? ' is-range' : ''
                }${isToday ? ' is-today' : ''}${inMonth ? '' : ' is-outside'}`}
                onClick={() => {
                  if (!pickingEnd) {
                    setDraftStart(key);
                    setDraftEnd(key);
                    setPickingEnd(true);
                    return;
                  }
                  setDraftEnd(key);
                  setPickingEnd(false);
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        <p className="bb-date-picker-summary">{summary}</p>

        <footer className="bb-date-picker-actions">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              const now = toDateKey(new Date());
              setDraftStart(now);
              setDraftEnd(now);
              setPickingEnd(false);
              setMonthAnchor(new Date());
            }}
          >
            Today
          </button>
          <div className="bb-date-picker-actions-end">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              disabled={!span.start}
              onClick={() => {
                onApply?.({ from: span.start, to: span.end || span.start });
              }}
            >
              Apply
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
