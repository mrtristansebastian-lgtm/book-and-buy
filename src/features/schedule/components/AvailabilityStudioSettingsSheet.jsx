import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, Clock, CalendarDays, X } from 'lucide-react';
import { DateField } from '../../../shared/ui/DateField';
import { TimeField } from '../../../shared/ui/TimeField';
import { WEEKDAY_KEYS, normalizeAvailabilityRules } from '../../../utils/staffAvailability';
import { AdvanceBookingField } from './AdvanceBookingField';

const WEEKDAY_LABELS = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun'
};

const SECTIONS = [
  { id: 'hours', label: 'Business hours', Icon: Clock },
  { id: 'window', label: 'Booking window', Icon: CalendarDays },
  { id: 'status', label: 'Manage status', Icon: CalendarRange }
];

const BUSINESS_STATUS_OPTIONS = [
  { id: 'open', label: 'Available' },
  { id: 'business-closed', label: 'Closed' }
];

const STAFF_STATUS_OPTIONS = [
  { id: 'open', label: 'Open' },
  { id: 'break', label: 'Break' },
  { id: 'off', label: 'Off day' },
  { id: 'business-closed', label: 'Business closed' }
];

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

function HoursSection({ availabilityRules, onUpdateRules }) {
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
  const dirty = useMemo(() => {
    const seeded = seedWeekdayHours(availabilityRules);
    return JSON.stringify(seeded) !== JSON.stringify(draft);
  }, [availabilityRules, draft]);

  const save = () => {
    if (!rowsValid || openCount < 1) return;
    const openWeekdays = WEEKDAY_KEYS.filter((key) => draft[key].open);
    const seed = draft[openWeekdays[0]];
    onUpdateRules?.({
      weekdayHours: draft,
      openWeekdays,
      businessOpenTime: seed.openTime,
      businessCloseTime: seed.closeTime
    });
  };

  return (
    <div className="bb-schedule-avail-settings-section">
      <div className="bb-schedule-hours-rows">
        {WEEKDAY_KEYS.map((key) => {
          const row = draft[key];
          return (
            <div key={key} className={`bb-schedule-hours-row${row.open ? '' : ' is-closed'}`}>
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
      <div className="bb-schedule-avail-settings-section-actions">
        <button
          type="button"
          className="bb-primary-btn"
          disabled={!dirty || !rowsValid || openCount < 1}
          onClick={save}
        >
          Save hours
        </button>
      </div>
    </div>
  );
}

function StatusSection({
  staffName,
  openTime,
  closeTime,
  initialDay,
  businessOnly = false,
  allowBusinessClosed = false,
  onApply
}) {
  const statusOptions = businessOnly
    ? BUSINESS_STATUS_OPTIONS
    : allowBusinessClosed
      ? STAFF_STATUS_OPTIONS
      : STAFF_STATUS_OPTIONS.filter((option) => option.id !== 'business-closed');
  const [status, setStatus] = useState('open');
  const [startDate, setStartDate] = useState(initialDay);
  const [endDate, setEndDate] = useState(initialDay);
  const [startTime, setStartTime] = useState(openTime);
  const [endTime, setEndTime] = useState(closeTime);

  useEffect(() => {
    setStartDate(initialDay);
    setEndDate(initialDay);
    setStartTime(openTime);
    setEndTime(closeTime);
    setStatus('open');
  }, [initialDay, openTime, closeTime]);

  const datesValid = Boolean(startDate && endDate && endDate >= startDate);
  const needsTimes = !businessOnly && (status === 'open' || status === 'break');
  const timesValid = !needsTimes || (startTime && endTime && endTime > startTime);
  const canApply = datesValid && timesValid;

  return (
    <div className="bb-schedule-avail-settings-section">
      <p className="bb-schedule-avail-hint m-0">
        {businessOnly
          ? 'Marks the whole business available or closed for every day in the range.'
          : `Applies to ${staffName || 'staff'} for every day in the range.`}
      </p>

      <div className="bb-schedule-avail-status" role="tablist" aria-label="Availability status">
        {statusOptions.map((option) => (
          <button
            key={option.id}
            type="button"
            role="tab"
            aria-selected={status === option.id}
            className={`bb-schedule-avail-status-btn${status === option.id ? ' is-active' : ''}`}
            onClick={() => setStatus(option.id)}
          >
            {option.label}
          </button>
        ))}
      </div>

      <div className="bb-schedule-avail-status-sheet-fields">
        <DateField
          label="Start date"
          value={startDate}
          onChange={(next) => {
            setStartDate(next);
            if (endDate && endDate < next) setEndDate(next);
          }}
        />
        <DateField
          label="End date"
          value={endDate}
          min={startDate || undefined}
          onChange={setEndDate}
        />
        {needsTimes ? (
          <>
            <TimeField label="Start time" value={startTime} onChange={setStartTime} />
            <TimeField label="End time" value={endTime} onChange={setEndTime} />
          </>
        ) : null}
      </div>

      <div className="bb-schedule-avail-settings-section-actions">
        <button
          type="button"
          className="bb-primary-btn"
          disabled={!canApply}
          onClick={() => {
            if (!canApply) return;
            onApply?.({
              status,
              startDate,
              endDate,
              startTime,
              endTime
            });
          }}
        >
          Apply status
        </button>
      </div>
    </div>
  );
}

export function AvailabilityStudioSettingsSheet({
  availabilityRules = {},
  onUpdateRules,
  onClose,
  showBusinessHours = true,
  showManageStatus = true,
  staffName = '',
  openTime = '09:00',
  closeTime = '17:00',
  initialDay = '',
  businessOnly = false,
  allowBusinessClosed = false,
  onApplyStatus
}) {
  const sections = SECTIONS.filter((section) => {
    if (section.id === 'hours') return showBusinessHours;
    if (section.id === 'status') return showManageStatus;
    return true;
  });
  const [sectionId, setSectionId] = useState(sections[0]?.id || 'window');
  const active = sections.find((section) => section.id === sectionId) || sections[0];
  const copy =
    active?.id === 'hours'
      ? {
          title: 'Business hours',
          lede: 'Set open days and hours for each weekday.'
        }
      : active?.id === 'status'
        ? {
            title: 'Manage status',
            lede: businessOnly
              ? 'Mark the business available or closed across a date range.'
              : `Update ${staffName || 'staff'} status across a date range.`
          }
        : {
            title: 'Booking window',
            lede: 'How far ahead clients can book on your calendar.'
          };

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label="Availability settings"
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-schedule-avail-settings-panel">
        <header className="bb-services-sheet-head">
          <div>
            <p className="bb-services-sheet-eyebrow">Availability Studio</p>
            <h2 className="bb-services-sheet-title">Settings</h2>
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

        <div className="bb-schedule-avail-settings-layout">
          <aside className="bb-schedule-avail-settings-rail" aria-label="Settings sections">
            <nav className="bb-schedule-avail-settings-nav">
              {sections.map((section) => {
                const Icon = section.Icon;
                const selected = section.id === active?.id;
                return (
                  <button
                    key={section.id}
                    type="button"
                    className={`bb-schedule-avail-settings-nav-item${
                      selected ? ' is-active' : ''
                    }`}
                    aria-current={selected ? 'page' : undefined}
                    onClick={() => setSectionId(section.id)}
                  >
                    <Icon size={16} strokeWidth={2.2} aria-hidden="true" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </aside>

          <div className="bb-schedule-avail-settings-main">
            <header className="bb-schedule-avail-settings-main-head">
              <h3>{copy.title}</h3>
              <p>{copy.lede}</p>
            </header>

            {active?.id === 'hours' ? (
              <HoursSection
                availabilityRules={availabilityRules}
                onUpdateRules={onUpdateRules}
              />
            ) : null}

            {active?.id === 'window' ? (
              <div className="bb-schedule-avail-settings-section">
                <AdvanceBookingField
                  days={availabilityRules.maxAdvanceBookingDays ?? 90}
                  until={availabilityRules.maxAdvanceBookingUntil || ''}
                  onChange={(patch) => onUpdateRules?.(patch)}
                />
              </div>
            ) : null}

            {active?.id === 'status' ? (
              <StatusSection
                staffName={staffName}
                openTime={openTime}
                closeTime={closeTime}
                initialDay={initialDay}
                businessOnly={businessOnly}
                allowBusinessClosed={allowBusinessClosed}
                onApply={(payload) => {
                  onApplyStatus?.(payload);
                }}
              />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
