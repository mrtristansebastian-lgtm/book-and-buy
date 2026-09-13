import { useEffect, useMemo, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { DateField } from '../../../shared/ui/DateField';
import { TimeField } from '../../../shared/ui/TimeField';
import { getMaxBookableDateKey, isDateWithinAdvanceWindow } from '../../../utils/availability';
import { buildMonthGrid, formatDisplayDate, parseDateKey, toDateKey } from '../../../utils/dates';
import {
  canEditAvailabilityRules,
  canEditStaffAvailability,
  getVisibleStaffForAvailability,
  isWorkspaceOwnerViewer
} from '../../../utils/staffAccess';
import {
  WEEKDAY_KEYS,
  applyBusinessClosedToRange,
  applyStatusToRange,
  getEffectiveStaffWindows,
  isBusinessOpenOnDate,
  normalizeStaffAvailabilityEntry,
  resolveCalendarDayStatus,
  setStaffDayOverride
} from '../../../utils/staffAvailability';
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

const STATUS_OPTIONS = [
  { id: 'open', label: 'Open' },
  { id: 'break', label: 'Break' },
  { id: 'off', label: 'Off day' },
  { id: 'business-closed', label: 'Business closed' }
];

function formatWindowDate(dateKey = '') {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}

function startOfMonth(date = new Date()) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function sameMonth(a, b) {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function clampMonthAnchor(anchor, todayKey, maxBookableDateKey) {
  const today = parseDateKey(todayKey) || new Date();
  const minMonth = startOfMonth(today);
  let next = startOfMonth(anchor instanceof Date ? anchor : new Date());
  if (next < minMonth) next = minMonth;
  if (maxBookableDateKey) {
    const maxDate = parseDateKey(maxBookableDateKey);
    if (maxDate) {
      const maxMonth = startOfMonth(maxDate);
      if (next > maxMonth) next = maxMonth;
    }
  }
  return next;
}

function staffInitials(name = '') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

function staffPhoto(member) {
  return member?.photoURL || member?.imageUrl || '';
}

export function StaffAvailabilitySwitcher({ staff = [], staffId = '', onSelect }) {
  if (!staff.length) return null;
  return (
    <div className="bb-schedule-avail-avatars" role="tablist" aria-label="Staff member">
      {staff.map((member) => {
        const photo = staffPhoto(member);
        const active = member.id === staffId;
        return (
          <button
            key={member.id}
            type="button"
            role="tab"
            aria-selected={active}
            aria-label={member.name}
            title={member.name}
            className={`bb-schedule-avail-avatar${active ? ' is-active' : ''}`}
            style={{ '--staff-color': member.color || '#101828' }}
            onClick={() => onSelect?.(member.id)}
          >
            <span className="bb-schedule-avail-avatar-face">
              {photo ? <img src={photo} alt="" /> : staffInitials(member.name)}
            </span>
            <span className="bb-schedule-avail-avatar-name">{member.name}</span>
          </button>
        );
      })}
    </div>
  );
}

function AvailabilityStatusSheet({
  staffName,
  openTime,
  closeTime,
  initialDay,
  allowBusinessClosed = false,
  onClose,
  onApply
}) {
  const statusOptions = allowBusinessClosed
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((option) => option.id !== 'business-closed');
  const [status, setStatus] = useState('open');
  const [startDate, setStartDate] = useState(initialDay);
  const [endDate, setEndDate] = useState(initialDay);
  const [startTime, setStartTime] = useState(openTime);
  const [endTime, setEndTime] = useState(closeTime);

  const datesValid = Boolean(startDate && endDate && endDate >= startDate);
  const needsTimes = status === 'open' || status === 'break';
  const timesValid = !needsTimes || (startTime && endTime && endTime > startTime);
  const canApply = datesValid && timesValid;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bb-panel bb-schedule-avail-status-sheet w-full max-w-lg p-5 grid gap-4 max-h-[90vh] overflow-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avail-status-sheet-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bb-schedule-avail-status-sheet-head">
          <h2 id="avail-status-sheet-title" className="bb-page-title text-2xl m-0">
            Manage status
          </h2>
          <p className="bb-schedule-avail-hint m-0">
            Applies to {staffName || 'staff'} for every day in the range.
          </p>
        </div>

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
          {status === 'open' || status === 'break' ? (
            <>
              <TimeField
                label="Start time"
                value={startTime}
                onChange={setStartTime}
              />
              <TimeField
                label="End time"
                value={endTime}
                onChange={setEndTime}
              />
            </>
          ) : null}
        </div>

        {status === 'open' ? (
          <p className="bb-schedule-avail-hint m-0">
            Open days get this shift window. You can refine shifts per day on the calendar.
          </p>
        ) : status === 'break' ? (
          <p className="bb-schedule-avail-hint m-0">
            Break hours when {staffName || 'this staff member'} cannot be booked. Set the start and
            end time for the break window.
          </p>
        ) : status === 'business-closed' ? (
          <p className="bb-schedule-avail-hint m-0">
            Marks the whole business closed on these dates for every staff member.
          </p>
        ) : (
          <p className="bb-schedule-avail-hint m-0">
            Whole-day status for {staffName || 'this staff member'} — no bookable hours.
          </p>
        )}

        <div className="bb-schedule-avail-status-sheet-actions">
          <button type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </button>
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
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}

export function ScheduleAvailabilityEditor({
  staff = [],
  staffAvailability = {},
  availabilityRules = {},
  staffId: staffIdProp,
  onStaffIdChange,
  onSaveEntry,
  onUpdateRules
}) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const openTime = availabilityRules.businessOpenTime || '09:00';
  const closeTime = availabilityRules.businessCloseTime || '17:00';

  const isOwner = isWorkspaceOwnerViewer({ user, workspace });
  const visibleStaff = useMemo(
    () => getVisibleStaffForAvailability({ user, workspace, staff }),
    [user, workspace, staff]
  );

  const [staffIdInternal, setStaffIdInternal] = useState(
    () => staffIdProp || visibleStaff[0]?.id || staff[0]?.id || ''
  );
  const staffId = staffIdProp ?? staffIdInternal;
  const setStaffId = (nextId) => {
    if (onStaffIdChange) onStaffIdChange(nextId);
    else setStaffIdInternal(nextId);
  };
  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => toDateKey(new Date()));
  const [statusSheetOpen, setStatusSheetOpen] = useState(false);
  const [draftShifts, setDraftShifts] = useState([{ start: openTime, end: closeTime }]);

  useEffect(() => {
    if (!visibleStaff.length) {
      setStaffId('');
      return;
    }
    if (!visibleStaff.some((member) => member.id === staffId)) {
      setStaffId(visibleStaff[0].id);
    }
  }, [visibleStaff, staffId]);

  const canEditSelected = canEditStaffAvailability({
    user,
    workspace,
    staff,
    staffId
  });
  const canEditRules = canEditAvailabilityRules({ user, workspace });

  const entry = useMemo(
    () =>
      normalizeStaffAvailabilityEntry(
        staffAvailability[staffId] || { staffId },
        staffId,
        openTime,
        closeTime
      ),
    [staffAvailability, staffId, openTime, closeTime]
  );

  const monthDays = useMemo(() => buildMonthGrid(monthAnchor), [monthAnchor]);
  const selectedMember = staff.find((member) => member.id === staffId);
  const todayKey = toDateKey(new Date());
  const maxBookableDateKey = useMemo(
    () => getMaxBookableDateKey(availabilityRules, todayKey),
    [availabilityRules, todayKey]
  );
  const bookableWindowLabel = useMemo(() => {
    if (!maxBookableDateKey) return 'Bookable window · no limit';
    return `Bookable window · ${formatWindowDate(todayKey)} – ${formatWindowDate(maxBookableDateKey)}`;
  }, [todayKey, maxBookableDateKey]);
  const canGoPrevMonth = useMemo(() => {
    const today = parseDateKey(todayKey) || new Date();
    return !sameMonth(monthAnchor, today);
  }, [monthAnchor, todayKey]);
  const canGoNextMonth = useMemo(() => {
    if (!maxBookableDateKey) return true;
    const nextMonthStart = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 1);
    return toDateKey(nextMonthStart) <= maxBookableDateKey;
  }, [monthAnchor, maxBookableDateKey]);

  useEffect(() => {
    setMonthAnchor((prev) => {
      const clamped = clampMonthAnchor(prev, todayKey, maxBookableDateKey);
      return sameMonth(prev, clamped) ? prev : clamped;
    });
  }, [todayKey, maxBookableDateKey]);

  const selectedDayStatus = useMemo(
    () => resolveCalendarDayStatus(staffId, selectedDay, { [staffId]: entry }, availabilityRules),
    [staffId, selectedDay, entry, availabilityRules]
  );

  const canEditShifts = canEditSelected && selectedDayStatus === 'open';

  useEffect(() => {
    if (!staffId || !selectedDay) return;
    const windows = getEffectiveStaffWindows(
      staffId,
      selectedDay,
      { [staffId]: entry },
      availabilityRules
    );
    const explicit = entry.days?.[selectedDay];
    if (
      explicit?.status === 'open' ||
      (explicit?.open && explicit?.status !== 'break' && explicit?.status !== 'off')
    ) {
      setDraftShifts(
        explicit.ranges?.length
          ? explicit.ranges.map((range) => ({ ...range }))
          : [{ start: openTime, end: closeTime }]
      );
      return;
    }
    if (windows.length) {
      setDraftShifts(windows.map((range) => ({ ...range })));
      return;
    }
    setDraftShifts([{ start: openTime, end: closeTime }]);
  }, [staffId, selectedDay, entry, availabilityRules, openTime, closeTime]);

  const applyStatusFromSheet = ({ status, startDate, endDate, startTime, endTime }) => {
    if (!canEditSelected && status !== 'business-closed') return;
    if (status === 'business-closed') {
      if (!canEditRules) return;
      onUpdateRules?.(applyBusinessClosedToRange(availabilityRules, startDate, endDate, true));
      setStatusSheetOpen(false);
      return;
    }
    if (!staffId) return;
    const ranges =
      status === 'open' || status === 'break'
        ? [{ start: startTime || openTime, end: endTime || closeTime }]
        : null;
    const next = applyStatusToRange(
      entry,
      startDate,
      endDate,
      status,
      openTime,
      closeTime,
      ranges
    );
    if (canEditRules) {
      const reopened = applyBusinessClosedToRange(availabilityRules, startDate, endDate, false);
      if ((reopened.closedDates || []).length !== (availabilityRules.closedDates || []).length) {
        onUpdateRules?.(reopened);
      }
    }
    onSaveEntry?.(staffId, next);
    setSelectedDay(startDate);
    setStatusSheetOpen(false);
  };

  const saveDay = () => {
    if (!staffId || !selectedDay || !canEditShifts) return;
    const next = setStaffDayOverride(
      entry,
      selectedDay,
      {
        status: 'open',
        open: true,
        ranges: draftShifts,
        source: 'manual'
      },
      openTime,
      closeTime
    );
    onSaveEntry?.(staffId, next);
  };

  const updateShift = (index, patch) => {
    if (!canEditSelected) return;
    setDraftShifts((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  if (!visibleStaff.length) {
    return (
      <div className="bb-schedule-avail">
        <p className="bb-schedule-avail-hint">
          Only you and the owner can edit a staff member&apos;s availability. No editable schedule is
          linked to this account yet.
        </p>
      </div>
    );
  }

  return (
    <div className="bb-schedule-avail">
      <div className="bb-schedule-avail-toolbar">
        {canEditSelected ? (
          <div className="bb-schedule-avail-status-cta">
            <div className="bb-schedule-avail-status-cta-copy">
              <h3 className="bb-schedule-avail-status-cta-title">Statuses</h3>
              <p className="bb-schedule-avail-status-cta-body">
                {isOwner
                  ? 'Set open, break, off, or business-closed for any period you choose — pick the dates and hours in a short setup.'
                  : 'Set your open, break, or off periods — pick the dates and hours in a short setup.'}
              </p>
            </div>
            <button
              type="button"
              className="bb-schedule-avail-manage-btn"
              onClick={() => setStatusSheetOpen(true)}
            >
              <CalendarRange size={17} strokeWidth={2.2} aria-hidden="true" />
              Manage status
            </button>
          </div>
        ) : (
          <p className="bb-schedule-avail-hint">
            Only you and the owner can edit this staff member&apos;s availability.
          </p>
        )}
      </div>

      {canEditRules ? (
        <section className="bb-schedule-avail-panel bb-schedule-avail-advance-panel">
          <div className="bb-schedule-avail-advance-copy">
            <h3 className="bb-schedule-avail-title">Advance booking</h3>
            <p className="bb-schedule-avail-hint m-0">
              Clients can book up to this far ahead on your public Book page.
            </p>
          </div>
          <AdvanceBookingField
            days={availabilityRules.maxAdvanceBookingDays ?? 90}
            until={availabilityRules.maxAdvanceBookingUntil || ''}
            onChange={(patch) => onUpdateRules?.(patch)}
          />
        </section>
      ) : null}

      <section className="bb-schedule-avail-panel">
        <div className="bb-schedule-avail-cal-head">
          <div className="bb-schedule-avail-cal-copy">
            <h3 className="bb-schedule-avail-title">
              Calendar
              {selectedMember?.name ? ` · ${selectedMember.name}` : ''}
            </h3>
            <p className="bb-schedule-avail-window-hint">{bookableWindowLabel}</p>
          </div>
          <div className="bb-schedule-avail-legend" aria-label="Day colors">
            <span className="bb-schedule-avail-legend-item is-open">
              <i /> Open
            </span>
            <span className="bb-schedule-avail-legend-item is-break">
              <i /> Break
            </span>
            <span className="bb-schedule-avail-legend-item is-leave">
              <i /> Off
            </span>
            <span className="bb-schedule-avail-legend-item is-biz-closed">
              <i /> Business closed
            </span>
          </div>
        </div>

        <div className="bb-schedule-picker-month-nav">
          <button
            type="button"
            className="bb-ghost-btn px-3"
            aria-label="Previous month"
            disabled={!canGoPrevMonth}
            onClick={() =>
              setMonthAnchor((prev) =>
                clampMonthAnchor(
                  new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                  todayKey,
                  maxBookableDateKey
                )
              )
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
            disabled={!canGoNextMonth}
            onClick={() =>
              setMonthAnchor((prev) =>
                clampMonthAnchor(
                  new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                  todayKey,
                  maxBookableDateKey
                )
              )
            }
          >
            <ChevronRight size={18} />
          </button>
        </div>

        <div className="bb-schedule-picker-weekdays" aria-hidden="true">
          {WEEKDAY_KEYS.map((key) => (
            <span key={key}>{WEEKDAY_LABELS[key]}</span>
          ))}
        </div>

        <div className="bb-schedule-picker-grid">
          {monthDays.map((date) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === monthAnchor.getMonth();
            const inWindow = isDateWithinAdvanceWindow(key, availabilityRules, { todayKey });
            const status = resolveCalendarDayStatus(
              staffId,
              key,
              { [staffId]: entry },
              availabilityRules
            );
            const isFocusDay = key === selectedDay;
            return (
              <button
                key={key}
                type="button"
                className={`bb-schedule-picker-day is-${status}${
                  isFocusDay ? ' is-selected' : ''
                }${inMonth ? '' : ' is-outside'}${inWindow ? '' : ' is-outside-window'}`}
                onClick={() => {
                  setSelectedDay(key);
                  if (date.getMonth() !== monthAnchor.getMonth()) {
                    setMonthAnchor(
                      clampMonthAnchor(
                        new Date(date.getFullYear(), date.getMonth(), 1),
                        todayKey,
                        maxBookableDateKey
                      )
                    );
                  }
                }}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </section>

      <section className="bb-schedule-avail-panel bb-schedule-avail-shifts-panel">
        <div className="bb-schedule-avail-shifts-head">
          <h3 className="bb-schedule-avail-title">
            {formatDisplayDate(selectedDay)} · Shifts
          </h3>
          {!canEditShifts && selectedDayStatus !== 'open' ? (
            <span className="bb-schedule-avail-shifts-badge">
              {selectedDayStatus === 'business-closed'
                ? 'Business closed'
                : selectedDayStatus === 'break'
                  ? 'Break'
                  : 'Off day'}
            </span>
          ) : null}
        </div>

        {!canEditSelected ? (
          <p className="bb-schedule-avail-hint">
            Only you and the owner can edit this staff member&apos;s availability.
          </p>
        ) : canEditShifts ? (
          <>
            <div className="bb-schedule-avail-shifts">
              {draftShifts.map((shift, index) => (
                <div key={index} className="bb-schedule-avail-shift-row">
                  <div className="bb-schedule-avail-shift-times">
                    <TimeField
                      label="Start"
                      value={shift.start}
                      onChange={(next) => updateShift(index, { start: next })}
                    />
                    <TimeField
                      label="End"
                      value={shift.end}
                      onChange={(next) => updateShift(index, { end: next })}
                    />
                  </div>
                  {draftShifts.length > 1 ? (
                    <div className="bb-schedule-avail-shift-tools">
                      <button
                        type="button"
                        className="bb-ghost-btn bb-schedule-avail-shift-remove"
                        aria-label={`Remove shift ${index + 1}`}
                        onClick={() =>
                          setDraftShifts((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 size={15} strokeWidth={2.2} />
                      </button>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>

            <button
              type="button"
              className="bb-schedule-avail-add-shift"
              onClick={() =>
                setDraftShifts((prev) => [...prev, { start: openTime, end: closeTime }])
              }
            >
              <Plus size={16} strokeWidth={2.3} />
              Add shift
            </button>

            <div className="bb-schedule-avail-day-actions">
              <span className="bb-schedule-avail-hint">
                {isBusinessOpenOnDate(selectedDay, availabilityRules)
                  ? 'Shifts set when clients can book this staff member.'
                  : canEditRules
                    ? 'Business is closed this day — use Manage status to reopen.'
                    : 'Business is closed this day. Ask the owner to reopen it.'}
              </span>
              <button type="button" className="bb-primary-btn" onClick={saveDay}>
                Save day
              </button>
            </div>
          </>
        ) : (
          <p className="bb-schedule-avail-hint">
            Use <strong>Manage status</strong> to set this day to Open before adding shifts.
          </p>
        )}
      </section>

      {statusSheetOpen && canEditSelected ? (
        <AvailabilityStatusSheet
          staffName={selectedMember?.name}
          openTime={openTime}
          closeTime={closeTime}
          initialDay={selectedDay}
          allowBusinessClosed={canEditRules}
          onClose={() => setStatusSheetOpen(false)}
          onApply={applyStatusFromSheet}
        />
      ) : null}
    </div>
  );
}
