import { useMemo, useState } from 'react';
import { Check, ChevronLeft, ChevronRight, Clock3, Pencil, Plus, Settings2, X } from 'lucide-react';
import { getLocalDateStr } from '../../../utils/dates';

export const ScheduleTimeline = ({
  bookingsByTime,
  canEdit,
  dayConfig,
  isPastDay,
  onAddSlot,
  onEditSlot,
  onMove,
  onOpenSettings,
  onSelectDate,
  onToggleAvailability,
  openSlotCount,
  selectedDate,
  selectedDayTitle,
  selectedBookings,
  todayStr
}) => {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerMonth, setPickerMonth] = useState(() => new Date(`${selectedDate}T00:00:00`));
  const selectedDateObj = new Date(`${selectedDate}T00:00:00`);
  const pickerMonthLabel = pickerMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  const monthDays = useMemo(() => {
    const firstDay = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), 1);
    const lastDay = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 0);
    const leadingDays = (firstDay.getDay() + 6) % 7;
    return [
      ...Array.from({ length: leadingDays }, (_, index) => ({ key: `empty-${index}`, empty: true })),
      ...Array.from({ length: lastDay.getDate() }, (_, index) => {
        const date = new Date(pickerMonth.getFullYear(), pickerMonth.getMonth(), index + 1);
        return { key: getLocalDateStr(date), date, dateStr: getLocalDateStr(date), empty: false };
      })
    ];
  }, [pickerMonth]);

  const selectFromPicker = (dateStr) => {
    onSelectDate(dateStr);
    setPickerOpen(false);
  };

  return (
    <section className="schedule-timeline">
      <div className="schedule-timeline-head">
        <div className="schedule-timeline-title">
          <p>Today's Timeline</p>
          <div className="schedule-timeline-date-row">
            <h3>{selectedDayTitle}</h3>
            <button type="button" onClick={() => setPickerOpen(true)} aria-label="Edit selected day" title="Edit selected day">
              <Pencil size={15} />
            </button>
          </div>
          <span>{openSlotCount} open / {dayConfig.times.length || 0} planned / {selectedBookings.length} records</span>
        </div>

        <div className="schedule-timeline-actions">
          {!isPastDay && canEdit && (
            <button
              type="button"
              className={`schedule-day-toggle ${dayConfig.available ? 'is-open' : 'is-closed'}`}
              onClick={onToggleAvailability}
              aria-label={dayConfig.available ? 'Close selected day' : 'Open selected day'}
              title={dayConfig.available ? 'Close selected day' : 'Open selected day'}
            >
              {dayConfig.available ? <Check size={17} /> : <X size={17} />}
            </button>
          )}
          {!isPastDay && canEdit && (
            <button type="button" className="schedule-icon-button is-primary" onClick={onAddSlot} aria-label="Add slot">
              <Plus size={17} />
            </button>
          )}
          <button type="button" className="schedule-settings-round" onClick={onOpenSettings} aria-label="Schedule settings" title="Schedule settings">
            <Settings2 size={17} />
          </button>
          <button type="button" onClick={() => onMove(-1)} aria-label="Previous day">
            <ChevronLeft size={17} />
          </button>
          <button type="button" onClick={() => onMove(1)} aria-label="Next day">
            <ChevronRight size={17} />
          </button>
        </div>
      </div>

      <div className="schedule-timeline-list">
        {dayConfig.times.length ? dayConfig.times.map(time => {
          const timeBookings = bookingsByTime[time] || [];
          const booked = timeBookings.length > 0;
          return (
            <div key={time} className={`schedule-timeline-row ${booked ? 'is-booked' : ''}`}>
              <time>{time}</time>
              <div className="schedule-timeline-main">
                <strong>{booked ? timeBookings.map(booking => booking.clientName || 'Client').join(', ') : 'Open booking window'}</strong>
                <small>{booked ? timeBookings.map(booking => booking.serviceName || 'Service').join(' / ') : 'No booking assigned'}</small>
              </div>
              <span className={`schedule-slot-state ${booked ? 'is-booked' : 'is-open'}`}>{booked ? `${timeBookings.length} booked` : 'Open'}</span>
              {!isPastDay && canEdit && (
                <button type="button" className="schedule-row-action" onClick={() => onEditSlot(time)} aria-label={`Edit ${time}`}>
                  <Pencil size={13} />
                </button>
              )}
            </div>
          );
        }) : (
          <div className="schedule-empty-state">
            <Clock3 size={18} />
            <strong>{dayConfig.available ? 'No slots planned' : 'Closed day'}</strong>
            <small>{dayConfig.available ? 'Add a slot or apply your default slots.' : 'Use the tick button to reopen this day.'}</small>
          </div>
        )}
      </div>

      {pickerOpen && (
        <div className="schedule-date-picker-backdrop">
          <div className="schedule-date-picker-modal" role="dialog" aria-modal="true" aria-label="Select schedule day">
            <div className="schedule-panel-title">
              <div>
                <p>Select Day</p>
                <h3>{pickerMonthLabel}</h3>
              </div>
              <button type="button" className="schedule-icon-button" onClick={() => setPickerOpen(false)} aria-label="Close date picker">
                <X size={16} />
              </button>
            </div>
            <div className="schedule-picker-month-nav">
              <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() - 1, 1))}>
                <ChevronLeft size={16} />
                Previous
              </button>
              <button type="button" onClick={() => setPickerMonth(new Date())}>Today</button>
              <button type="button" onClick={() => setPickerMonth(new Date(pickerMonth.getFullYear(), pickerMonth.getMonth() + 1, 1))}>
                Next
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="schedule-picker-weekdays" aria-hidden="true">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => <span key={day}>{day}</span>)}
            </div>
            <div className="schedule-picker-grid">
              {monthDays.map(day => day.empty ? (
                <span key={day.key} className="is-empty" />
              ) : (
                <button
                  key={day.key}
                  type="button"
                  className={`${day.dateStr === selectedDate ? 'is-active' : ''} ${day.dateStr === todayStr ? 'is-today' : ''}`}
                  onClick={() => selectFromPicker(day.dateStr)}
                >
                  {day.date.getDate()}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  );
};
