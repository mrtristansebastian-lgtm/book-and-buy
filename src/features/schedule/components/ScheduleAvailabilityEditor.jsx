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
  getVisibleStaffForAvailability
} from '../../../utils/staffAccess';
import {
  WEEKDAY_KEYS,
  applyBusinessClosedToRange,
  applyStatusToRange,
  getEffectiveStaffWindows,
  normalizeStaffAvailabilityEntry,
  resolveCalendarDayStatus,
  getStaffDayTimeline,
  setStaffDayOverride
} from '../../../utils/staffAvailability';
import { AdvanceBookingField } from './AdvanceBookingField';
import { DayTimelineMeter } from './DayTimelineMeter';

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

function mapCalendarStatusToDraft(status) {
  if (status === 'business-closed') return 'business-closed';
  if (status === 'break') return 'break';
  if (status === 'leave') return 'off';
  return 'open';
}

function rangesAreValid(ranges = []) {
  return (ranges || []).some(
    (range) => range?.start && range?.end && String(range.end) > String(range.start)
  );
}

function seedDraftRangesForStatus(status, explicit, openTime, closeTime) {
  if (status === 'open') {
    if (explicit?.status === 'open' && Array.isArray(explicit.ranges) && explicit.ranges.length) {
      return explicit.ranges.map((range) => ({ ...range }));
    }
    return [{ start: openTime, end: closeTime }];
  }
  if (status === 'break') {
    if (explicit?.status === 'break' && Array.isArray(explicit.ranges) && explicit.ranges.length) {
      return explicit.ranges.map((range) => ({ ...range }));
    }
    return [{ start: '12:00', end: '13:00' }];
  }
  return [];
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
  const [dayDraftStatus, setDayDraftStatus] = useState('open');
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
    if (!maxBookableDateKey) return 'Availability period · no limit';
    return `Availability period · ${formatWindowDate(todayKey)} – ${formatWindowDate(maxBookableDateKey)}`;
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

  const selectedTimeline = useMemo(
    () => getStaffDayTimeline(staffId, selectedDay, { [staffId]: entry }, availabilityRules),
    [staffId, selectedDay, entry, availabilityRules]
  );

  const openTimeLabel = availabilityRules?.businessOpenTime || '09:00';
  const closeTimeLabel = availabilityRules?.businessCloseTime || '17:00';

  const dayStatusOptions = canEditRules
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((option) => option.id !== 'business-closed');

  const dayLockedByBusinessClose =
    selectedDayStatus === 'business-closed' && !canEditRules;

  const canEditDayTimes =
    canEditSelected &&
    !dayLockedByBusinessClose &&
    (dayDraftStatus === 'open' || dayDraftStatus === 'break');

  const dayTimesValid =
    dayDraftStatus === 'off' ||
    dayDraftStatus === 'business-closed' ||
    rangesAreValid(draftShifts);

  const canSaveDay =
    Boolean(staffId && selectedDay) &&
    dayTimesValid &&
    (dayDraftStatus === 'business-closed'
      ? canEditRules
      : canEditSelected && !dayLockedByBusinessClose);

  useEffect(() => {
    if (!staffId || !selectedDay) return;
    const mapped = mapCalendarStatusToDraft(selectedDayStatus);
    setDayDraftStatus(mapped);
    const explicit = entry.days?.[selectedDay];
    if (mapped === 'open') {
      const windows = getEffectiveStaffWindows(
        staffId,
        selectedDay,
        { [staffId]: entry },
        availabilityRules
      );
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
      return;
    }
    setDraftShifts(seedDraftRangesForStatus(mapped, explicit, openTime, closeTime));
  }, [
    staffId,
    selectedDay,
    selectedDayStatus,
    entry,
    availabilityRules,
    openTime,
    closeTime
  ]);

  const changeDayStatus = (nextStatus) => {
    if (!canEditSelected && nextStatus !== 'business-closed') return;
    if (nextStatus === 'business-closed' && !canEditRules) return;
    if (dayLockedByBusinessClose) return;
    setDayDraftStatus(nextStatus);
    const explicit = entry.days?.[selectedDay];
    setDraftShifts(seedDraftRangesForStatus(nextStatus, explicit, openTime, closeTime));
  };

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
    if (!staffId || !selectedDay || !canSaveDay) return;

    if (dayDraftStatus === 'business-closed') {
      if (!canEditRules) return;
      onUpdateRules?.(
        applyBusinessClosedToRange(availabilityRules, selectedDay, selectedDay, true)
      );
      return;
    }

    if (!canEditSelected) return;

    if (canEditRules && selectedDayStatus === 'business-closed') {
      onUpdateRules?.(
        applyBusinessClosedToRange(availabilityRules, selectedDay, selectedDay, false)
      );
    }

    if (dayDraftStatus === 'open') {
      if (!rangesAreValid(draftShifts)) return;
      onSaveEntry?.(
        staffId,
        setStaffDayOverride(
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
        )
      );
      return;
    }

    if (dayDraftStatus === 'break') {
      if (!rangesAreValid(draftShifts)) return;
      onSaveEntry?.(
        staffId,
        setStaffDayOverride(
          entry,
          selectedDay,
          {
            status: 'break',
            open: false,
            ranges: draftShifts,
            source: 'manual'
          },
          openTime,
          closeTime
        )
      );
      return;
    }

    onSaveEntry?.(
      staffId,
      setStaffDayOverride(
        entry,
        selectedDay,
        {
          status: 'off',
          open: false,
          ranges: [],
          source: 'manual'
        },
        openTime,
        closeTime
      )
    );
  };

  const updateShift = (index, patch) => {
    if (!canEditDayTimes) return;
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
      {canEditSelected || canEditRules ? (
        <section className="bb-schedule-avail-panel bb-schedule-avail-setup-panel">
          <div className="bb-schedule-avail-setup-copy">
            <h3 className="bb-schedule-avail-title">Availability setup</h3>
            <p className="bb-schedule-avail-hint m-0">
              {canEditRules
                ? 'Set how far ahead clients can book, then manage open, break, off, or closed days.'
                : 'Manage open, break, or off days on your calendar.'}
            </p>
          </div>
          <div className="bb-schedule-avail-setup-tools">
            {canEditRules ? (
              <AdvanceBookingField
                days={availabilityRules.maxAdvanceBookingDays ?? 90}
                until={availabilityRules.maxAdvanceBookingUntil || ''}
                onChange={(patch) => onUpdateRules?.(patch)}
              />
            ) : null}
            {canEditSelected ? (
              <button
                type="button"
                className="bb-schedule-avail-manage-btn"
                onClick={() => setStatusSheetOpen(true)}
              >
                <CalendarRange size={17} strokeWidth={2.2} aria-hidden="true" />
                Manage status
              </button>
            ) : null}
          </div>
        </section>
      ) : (
        <p className="bb-schedule-avail-hint">
          Only you and the owner can edit this staff member&apos;s availability.
        </p>
      )}

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
            // Break days stay green on the month grid; breakdown lives in day view.
            const gridStatus = status === 'break' ? 'open' : status;
            const isFocusDay = key === selectedDay;
            return (
              <button
                key={key}
                type="button"
                className={`bb-schedule-picker-day is-${gridStatus}${
                  isFocusDay ? ' is-selected' : ''
                }${inMonth ? '' : ' is-outside'}${inWindow ? '' : ' is-outside-window'}`}
                aria-label={`${formatDisplayDate(key)}, ${status}`}
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

        <div className="bb-schedule-day-meter-block">
          <div className="bb-schedule-day-meter-block-head">
            <p className="bb-schedule-avail-day-section-label m-0">
              {formatDisplayDate(selectedDay)} · Day timeline
            </p>
            <span className="bb-schedule-day-meter-hours">
              {openTimeLabel} – {closeTimeLabel}
            </span>
          </div>
          <DayTimelineMeter
            segments={selectedTimeline.segments}
            status={selectedTimeline.status}
            dayStart={selectedTimeline.dayStart}
            dayEnd={selectedTimeline.dayEnd}
          />
          {selectedTimeline.segments.some((segment) => segment.kind === 'open') ||
          selectedTimeline.segments.some((segment) => segment.kind === 'break') ? (
            <div className="bb-schedule-day-meter-legend" aria-hidden="true">
              {selectedTimeline.segments.some((segment) => segment.kind === 'open') ? (
                <span className="bb-schedule-day-meter-legend-item is-open">
                  <i /> Shift
                </span>
              ) : null}
              {selectedTimeline.segments.some((segment) => segment.kind === 'break') ? (
                <span className="bb-schedule-day-meter-legend-item is-break">
                  <i /> Break
                </span>
              ) : null}
            </div>
          ) : (
            <p className="bb-schedule-avail-hint m-0 text-sm">
              {selectedTimeline.status === 'leave'
                ? 'Off — no bookable hours.'
                : selectedTimeline.status === 'business-closed'
                  ? 'Business closed this day.'
                  : 'No shift windows on this day.'}
            </p>
          )}
        </div>
      </section>

      <section className="bb-schedule-avail-panel bb-schedule-avail-day-panel">
        <div className="bb-schedule-avail-shifts-head">
          <h3 className="bb-schedule-avail-title">
            {formatDisplayDate(selectedDay)} · Day
          </h3>
        </div>

        {!canEditSelected && !canEditRules ? (
          <p className="bb-schedule-avail-hint">
            Only you and the owner can edit this staff member&apos;s availability.
          </p>
        ) : dayLockedByBusinessClose ? (
          <p className="bb-schedule-avail-hint">
            Business is closed this day. Ask the owner to reopen it before editing staff availability.
          </p>
        ) : (
          <>
            <div className="bb-schedule-avail-day-status-block">
              <p className="bb-schedule-avail-day-section-label">Day status</p>
              <div className="bb-schedule-avail-status" role="tablist" aria-label="Day status">
                {dayStatusOptions.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    role="tab"
                    aria-selected={dayDraftStatus === option.id}
                    className={`bb-schedule-avail-status-btn${
                      dayDraftStatus === option.id ? ' is-active' : ''
                    }`}
                    onClick={() => changeDayStatus(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {canEditDayTimes ? (
              <div className="bb-schedule-avail-day-times-block">
                <p className="bb-schedule-avail-day-section-label">
                  {dayDraftStatus === 'break' ? 'Break hours' : 'Shifts'}
                </p>
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
                            aria-label={`Remove ${dayDraftStatus === 'break' ? 'break' : 'shift'} ${
                              index + 1
                            }`}
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
                    setDraftShifts((prev) => [
                      ...prev,
                      dayDraftStatus === 'break'
                        ? { start: '12:00', end: '13:00' }
                        : { start: openTime, end: closeTime }
                    ])
                  }
                >
                  <Plus size={16} strokeWidth={2.3} />
                  {dayDraftStatus === 'break' ? 'Add break' : 'Add shift'}
                </button>

                <p className="bb-schedule-avail-hint m-0">
                  {dayDraftStatus === 'break'
                    ? 'Break hours when this staff member cannot be booked.'
                    : 'Shifts set when clients can book this staff member.'}
                </p>
              </div>
            ) : (
              <p className="bb-schedule-avail-hint">
                {dayDraftStatus === 'business-closed'
                  ? 'Marks the whole business closed on this date for every staff member.'
                  : 'Whole-day off — no bookable hours for this staff member.'}
              </p>
            )}

            <div className="bb-schedule-avail-day-actions">
              <span className="bb-schedule-avail-hint">
                {dayDraftStatus === 'open'
                  ? 'Save to apply this day’s status and shifts.'
                  : dayDraftStatus === 'break'
                    ? 'Save to apply this day’s break hours.'
                    : 'Save to apply this day’s status.'}
              </span>
              <button
                type="button"
                className="bb-primary-btn"
                disabled={!canSaveDay}
                onClick={saveDay}
              >
                Save day
              </button>
            </div>
          </>
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
