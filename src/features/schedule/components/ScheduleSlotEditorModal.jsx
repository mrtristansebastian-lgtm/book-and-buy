import { Trash2, X } from 'lucide-react';
import { addMinutesToTime, timePartsToValue, toTimeParts } from '../utils/businessCalendarUtils';

export const ScheduleSlotEditorModal = ({
  deleteSlotFromEditor,
  saveSlotEditor,
  setSlotEditor,
  slotEditor
}) => {
  if (!slotEditor) return null;

  const isRangeMode = slotEditor.mode === 'range';
  const updateEditor = (nextFields) => setSlotEditor(current => current ? { ...current, ...nextFields } : current);
  const targetDateLabel = slotEditor.dateStr
    ? new Date(`${slotEditor.dateStr}T00:00:00`).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
    : (slotEditor.label || 'Selected day');
  const durationOptions = [
    { label: '30m', minutes: 30 },
    { label: '1h', minutes: 60 },
    { label: '90m', minutes: 90 },
    { label: '2h', minutes: 120 }
  ];

  const setTimeField = (field, value) => updateEditor({ [field]: value });
  const setTimePart = (field, part, rawValue) => {
    const fallback = field === 'end' ? addMinutesToTime(slotEditor.start, 60) : '09:00';
    const parts = toTimeParts(slotEditor[field], fallback);
    const nextNumber = Number.parseInt(String(rawValue).replace(/\D/g, ''), 10);
    if (!Number.isFinite(nextNumber)) return;
    setTimeField(field, timePartsToValue({
      ...parts,
      [part]: part === 'hour' ? Math.min(23, Math.max(0, nextNumber)) : Math.min(59, Math.max(0, nextNumber))
    }));
  };
  const setDurationFromStart = (minutes) => updateEditor({
    mode: 'range',
    end: addMinutesToTime(slotEditor.start, minutes)
  });

  const renderTimeControl = (field, label) => {
    const fallback = field === 'end' ? addMinutesToTime(slotEditor.start, 60) : '09:00';
    const { hour, minute } = toTimeParts(slotEditor[field], fallback);
    const paddedHour = String(hour).padStart(2, '0');
    const paddedMinute = String(minute).padStart(2, '0');

    return (
      <div className="schedule-slot-time-panel">
        {isRangeMode && <p className="schedule-slot-time-label">{label}</p>}
        <div className="schedule-slot-time-inputs">
          <label>
            <span>Hour</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={paddedHour}
              onChange={(event) => setTimePart(field, 'hour', event.target.value)}
              aria-label={`${label} hour`}
            />
          </label>
          <span aria-hidden="true">:</span>
          <label>
            <span>Min</span>
            <input
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={2}
              value={paddedMinute}
              onChange={(event) => setTimePart(field, 'minute', event.target.value)}
              aria-label={`${label} minute`}
            />
          </label>
        </div>

      </div>
    );
  };

  return (
    <div className="schedule-slot-backdrop">
      <div className="schedule-slot-modal" role="dialog" aria-modal="true" aria-label="Slot editor">
        <div className="schedule-slot-modal-body">
          <header className="schedule-slot-modal-head">
            <div>
              <p>{slotEditor.isDefaultSlot ? 'Edit Default' : slotEditor.originalTime ? 'Edit Slot' : 'New Slot'}</p>
              <h2>Slot time</h2>
              <div className="schedule-slot-meta">
                <span>{targetDateLabel}</span>
                <span>{isRangeMode ? 'Period' : 'Single time'}</span>
              </div>
            </div>
            <button type="button" className="schedule-icon-button" onClick={() => setSlotEditor(null)} aria-label="Close slot editor">
              <X size={18} />
            </button>
          </header>

          <div className="schedule-slot-segmented">
            <button type="button" className={!isRangeMode ? 'is-active' : ''} onClick={() => updateEditor({ mode: 'single', end: '' })}>
              Set time
            </button>
            <button type="button" className={isRangeMode ? 'is-active' : ''} onClick={() => updateEditor({ mode: 'range', end: slotEditor.end || addMinutesToTime(slotEditor.start, 60) })}>
              Period
            </button>
          </div>

          {isRangeMode && (
            <section className="schedule-slot-duration">
              <div>
                <p>Duration</p>
                <span>Starts at {slotEditor.start}</span>
              </div>
              <div>
                {durationOptions.map(option => (
                  <button type="button" key={option.label} onClick={() => setDurationFromStart(option.minutes)}>
                    {option.label}
                  </button>
                ))}
              </div>
            </section>
          )}

          <div className={`schedule-slot-time-grid ${isRangeMode ? 'has-range' : ''}`}>
            {renderTimeControl('start', isRangeMode ? 'Starts' : 'Time')}
            {isRangeMode && renderTimeControl('end', 'Ends')}
          </div>

          <footer className={`schedule-slot-actions ${slotEditor.originalTime ? 'has-delete' : ''}`}>
            {slotEditor.originalTime && (
              <button type="button" className="is-danger" onClick={deleteSlotFromEditor}>
                <Trash2 size={14} />
                Delete slot
              </button>
            )}
            <button type="button" onClick={() => setSlotEditor(null)}>Cancel</button>
            <button type="button" className="is-primary" onClick={saveSlotEditor}>Save slot</button>
          </footer>
        </div>
      </div>
    </div>
  );
};
