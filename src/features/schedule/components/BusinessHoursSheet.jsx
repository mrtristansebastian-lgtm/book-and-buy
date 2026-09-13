import { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { TimeField } from '../../../shared/ui/TimeField';
import { WEEKDAY_KEYS, normalizeAvailabilityRules } from '../../../utils/staffAvailability';

const WEEKDAY_LABELS = {
  mon: 'Monday',
  tue: 'Tuesday',
  wed: 'Wednesday',
  thu: 'Thursday',
  fri: 'Friday',
  sat: 'Saturday',
  sun: 'Sunday'
};

function seedWeekdayHours(availabilityRules = {}) {
  const rules = normalizeAvailabilityRules(availabilityRules);
  return WEEKDAY_KEYS.reduce((acc, key) => {
    const row = rules.weekdayHours?.[key] || {};
    acc[key] = {
      open: Boolean(row.open),
      openTime: row.openTime || rules.businessOpenTime || '09:00',
      closeTime: row.closeTime || rules.businessCloseTime || '17:00'
    };
    return acc;
  }, {});
}

export function BusinessHoursSheet({ availabilityRules = {}, onClose, onSave }) {
  const [draft, setDraft] = useState(() => seedWeekdayHours(availabilityRules));

  useEffect(() => {
    setDraft(seedWeekdayHours(availabilityRules));
  }, [availabilityRules]);

  const updateDay = (key, patch) => {
    setDraft((prev) => ({
      ...prev,
      [key]: { ...prev[key], ...patch }
    }));
  };

  const rowsValid = WEEKDAY_KEYS.every((key) => {
    const row = draft[key];
    if (!row?.open) return true;
    return row.openTime && row.closeTime && row.closeTime > row.openTime;
  });

  const openCount = WEEKDAY_KEYS.filter((key) => draft[key]?.open).length;

  const save = () => {
    if (!rowsValid || openCount < 1) return;
    const openWeekdays = WEEKDAY_KEYS.filter((key) => draft[key].open);
    const seed = draft[openWeekdays[0]];
    onSave?.({
      weekdayHours: draft,
      openWeekdays,
      businessOpenTime: seed.openTime,
      businessCloseTime: seed.closeTime
    });
  };

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Business hours"
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel" style={{ width: 'min(32rem, 100%)' }}>
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Business</p>
            <h2 className="bb-services-sheet-title">Business hours</h2>
            <p className="bb-services-sheet-lede">
              Set open days and hours for each weekday.
            </p>
          </div>
          <button
            type="button"
            className="bb-ghost-btn bb-services-sheet-close"
            aria-label="Close"
            onClick={onClose}
          >
            <X size={18} />
          </button>
        </header>

        <div className="bb-services-sheet-body">
          <div className="bb-schedule-hours-rows">
            {WEEKDAY_KEYS.map((key) => {
              const row = draft[key];
              return (
                <div
                  key={key}
                  className={`bb-schedule-hours-row${row.open ? '' : ' is-closed'}`}
                >
                  <label className="bb-schedule-hours-day">
                    <input
                      type="checkbox"
                      checked={Boolean(row.open)}
                      onChange={(event) => updateDay(key, { open: event.target.checked })}
                    />
                    <span>{WEEKDAY_LABELS[key]}</span>
                  </label>
                  {row.open ? (
                    <div className="bb-schedule-hours-times">
                      <TimeField
                        label="Opens"
                        value={row.openTime}
                        onChange={(next) => updateDay(key, { openTime: next })}
                      />
                      <TimeField
                        label="Closes"
                        value={row.closeTime}
                        onChange={(next) => updateDay(key, { closeTime: next })}
                      />
                    </div>
                  ) : (
                    <p className="bb-schedule-hours-closed-label">Closed</p>
                  )}
                </div>
              );
            })}
          </div>
          {openCount < 1 ? (
            <p className="bb-schedule-avail-hint m-0">Keep at least one weekday open.</p>
          ) : null}
        </div>

        <footer className="bb-services-sheet-footer">
          <span />
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-ghost-btn" onClick={onClose}>
              Cancel
            </button>
            <button
              type="button"
              className="bb-primary-btn"
              disabled={!rowsValid || openCount < 1}
              onClick={save}
            >
              Save hours
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
