import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { DateField } from '../../../shared/ui/DateField';
import { TimeField } from '../../../shared/ui/TimeField';
import { getMaxBookableDateKey, isDateWithinAdvanceWindow } from '../../../utils/availability';
import {
  addDays,
  buildMonthGrid,
  formatDisplayDate,
  parseDateKey,
  toDateKey
} from '../../../utils/dates';
import {
  canEditAvailabilityRules,
  canEditStaffAvailability,
  getVisibleStaffForAvailability
} from '../../../utils/staffAccess';
import {
  WEEKDAY_KEYS,
  BUSINESS_AVAILABILITY_ID,
  applyBusinessClosedToRange,
  applyStatusToRange,
  getEffectiveStaffWindows,
  normalizeStaffAvailabilityEntry,
  resolveCalendarDayStatus,
  getStaffDayTimeline,
  getBusinessDayTimeline,
  getBusinessHoursForDate,
  isBusinessOpenOnDate,
  setStaffDayOverride
} from '../../../utils/staffAvailability';
import { AvailabilityStudioSettingsSheet } from './AvailabilityStudioSettingsSheet';
import { DayTimelineMeter, buildTimelineAxisMarks } from './DayTimelineMeter';

export { BUSINESS_AVAILABILITY_ID };

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
  { id: 'open', label: 'Working' },
  { id: 'off', label: 'Off day' },
  { id: 'leave', label: 'Leave' }
];

/** Paint / cycle statuses — break is day-specific only */
const STAFF_PAINT_OPTIONS = [
  { id: 'open', label: 'Working' },
  { id: 'off', label: 'Off day' },
  { id: 'leave', label: 'Leave' }
];

const BUSINESS_STATUS_OPTIONS = [
  { id: 'open', label: 'Available' },
  { id: 'business-closed', label: 'Closed' }
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
  if (status === 'leave') return 'leave';
  if (status === 'off') return 'off';
  // Legacy break days edit as Working + break rows in the feed
  return 'open';
}

function rangesAreValid(ranges = []) {
  return (ranges || []).some(
    (range) => range?.start && range?.end && String(range.end) > String(range.start)
  );
}

function statusTileLabel(status, businessFocus = false) {
  if (status === 'business-closed') return 'Closed';
  if (status === 'break') return 'Break';
  if (status === 'leave') return 'Leave';
  if (status === 'off') return 'Off';
  return businessFocus ? 'Available' : 'Working';
}

function orderedDateSpan(startKey, endKey) {
  let start = parseDateKey(startKey);
  let end = parseDateKey(endKey || startKey);
  if (!start) return { startKey: '', endKey: '', keys: [] };
  if (!end) end = start;
  if (start > end) {
    const swap = start;
    start = end;
    end = swap;
  }
  const keys = [];
  for (let cursor = new Date(start); cursor <= end; cursor = addDays(cursor, 1)) {
    keys.push(toDateKey(cursor));
  }
  return { startKey: toDateKey(start), endKey: toDateKey(end), keys };
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

export function StaffAvailabilitySwitcher({
  staff = [],
  staffId = '',
  onSelect,
  businessName = 'Business',
  businessLogoUrl = '',
  showBusiness = true
}) {
  if (!showBusiness && !staff.length) return null;
  return (
    <div className="bb-schedule-avail-avatars" role="tablist" aria-label="Availability profile">
      {showBusiness ? (
        <button
          type="button"
          role="tab"
          aria-selected={staffId === BUSINESS_AVAILABILITY_ID}
          aria-label={businessName || 'Business'}
          title={businessName || 'Business'}
          className={`bb-schedule-avail-avatar is-business${
            staffId === BUSINESS_AVAILABILITY_ID ? ' is-active' : ''
          }`}
          style={{ '--staff-color': '#0f766e' }}
          onClick={() => onSelect?.(BUSINESS_AVAILABILITY_ID)}
        >
          <span className="bb-schedule-avail-avatar-face">
            {businessLogoUrl ? (
              <img src={businessLogoUrl} alt="" />
            ) : (
              staffInitials(businessName || 'Business')
            )}
          </span>
          <span className="bb-schedule-avail-avatar-name">{businessName || 'Business'}</span>
        </button>
      ) : null}
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

function SelectRangeSheet({
  staffName,
  initialDay,
  businessOnly = false,
  openTime = '09:00',
  closeTime = '17:00',
  onClose,
  onApply
}) {
  const statusOptions = businessOnly ? BUSINESS_STATUS_OPTIONS : STAFF_PAINT_OPTIONS;
  const [status, setStatus] = useState(statusOptions[0]?.id || 'open');
  const [startDate, setStartDate] = useState(initialDay);
  const [endDate, setEndDate] = useState(initialDay);

  useEffect(() => {
    setStartDate(initialDay);
    setEndDate(initialDay);
    setStatus(statusOptions[0]?.id || 'open');
  }, [initialDay, businessOnly]);

  const datesValid = Boolean(startDate && endDate && endDate >= startDate);
  const canApply = datesValid;

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bb-panel bb-schedule-avail-status-sheet bb-schedule-avail-select-range-sheet w-full max-w-md p-5 grid gap-4 max-h-[90vh] overflow-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avail-select-range-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bb-schedule-avail-status-sheet-head">
          <h2 id="avail-select-range-title" className="bb-page-title text-2xl m-0">
            Select range
          </h2>
          <p className="bb-schedule-avail-hint m-0">
            {businessOnly
              ? 'Choose dates and apply available or closed.'
              : `Apply a status across dates for ${staffName || 'this staff member'}.`}
          </p>
        </div>

        <div className="bb-schedule-avail-status" role="tablist" aria-label="Availability status">
          {statusOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={status === option.id}
              className={`bb-schedule-avail-status-btn is-paint is-${option.id}${
                status === option.id ? ' is-active' : ''
              }`}
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
        </div>

        <p className="bb-schedule-avail-hint m-0">
          {businessOnly
            ? status === 'business-closed'
              ? 'Closed days override weekly open days for the whole business.'
              : 'Available clears closed dates in this range. Weekly open days still apply.'
            : status === 'leave'
              ? `Leave marks ${staffName || 'this staff member'} unavailable for the selected dates.`
              : status === 'off'
                ? `Off day marks ${staffName || 'this staff member'} as not working.`
                : 'Working days use business hours. Refine shifts per day on the calendar.'}
        </p>

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
                startTime: openTime,
                endTime: closeTime
              });
            }}
          >
            Apply range
          </button>
        </div>
      </div>
    </div>
  );
}

function ChangeDayStatusSheet({
  businessOnly = false,
  currentStatus = 'open',
  onClose,
  onApply
}) {
  const statusOptions = businessOnly ? BUSINESS_STATUS_OPTIONS : STATUS_OPTIONS;
  const [status, setStatus] = useState(
    statusOptions.some((option) => option.id === currentStatus)
      ? currentStatus
      : statusOptions[0]?.id || 'open'
  );

  return (
    <div
      className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4"
      role="presentation"
      onClick={onClose}
    >
      <div
        className="bb-panel bb-schedule-avail-status-sheet bb-schedule-avail-change-status-sheet w-full max-w-sm p-5 grid gap-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="avail-change-status-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="bb-schedule-avail-status-sheet-head">
          <h2 id="avail-change-status-title" className="bb-page-title text-2xl m-0">
            Change status
          </h2>
          <p className="bb-schedule-avail-hint m-0">
            {businessOnly ? 'Set this business day.' : 'Set this staff day.'}
          </p>
        </div>

        <div className="bb-schedule-avail-status" role="tablist" aria-label="Day status">
          {statusOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              role="tab"
              aria-selected={status === option.id}
              className={`bb-schedule-avail-status-btn is-paint is-${option.id}${
                status === option.id ? ' is-active' : ''
              }`}
              onClick={() => setStatus(option.id)}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="bb-schedule-avail-status-sheet-actions">
          <button type="button" className="bb-ghost-btn" onClick={onClose}>
            Cancel
          </button>
          <button
            type="button"
            className="bb-primary-btn"
            onClick={() => {
              onApply?.(status);
              onClose?.();
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
  onUpdateRules,
  studioSettingsOpen = false,
  onStudioSettingsOpenChange
}) {
  const { user } = useAuth();
  const { workspace } = useWorkspace();
  const openTime = availabilityRules.businessOpenTime || '09:00';
  const closeTime = availabilityRules.businessCloseTime || '17:00';

  const visibleStaff = useMemo(
    () => getVisibleStaffForAvailability({ user, workspace, staff }),
    [user, workspace, staff]
  );

  const canEditRules = canEditAvailabilityRules({ user, workspace });

  const [staffIdInternal, setStaffIdInternal] = useState(
    () =>
      staffIdProp ||
      (canEditRules
        ? BUSINESS_AVAILABILITY_ID
        : visibleStaff[0]?.id || staff[0]?.id || '')
  );
  const staffId = staffIdProp ?? staffIdInternal;
  const setStaffId = (nextId) => {
    if (onStaffIdChange) onStaffIdChange(nextId);
    else setStaffIdInternal(nextId);
  };
  const isBusinessFocus = staffId === BUSINESS_AVAILABILITY_ID;

  const [monthAnchor, setMonthAnchor] = useState(() => new Date());
  const [selectedDay, setSelectedDay] = useState(() => toDateKey(new Date()));
  const [selectRangeOpen, setSelectRangeOpen] = useState(false);
  const [dayDraftStatus, setDayDraftStatus] = useState('open');
  const [draftShifts, setDraftShifts] = useState([{ start: openTime, end: closeTime }]);
  const [draftBreaks, setDraftBreaks] = useState([]);
  const [dayStatusSheetOpen, setDayStatusSheetOpen] = useState(false);
  const [activeEdit, setActiveEdit] = useState(null);
  const suppressPaintClickRef = useRef(false);
  const paintPreviewKeys = useMemo(() => {
    if (!activeEdit?.dragging || !activeEdit.dragStart) return new Set();
    return new Set(
      orderedDateSpan(activeEdit.dragStart, activeEdit.dragHover || activeEdit.dragStart).keys
    );
  }, [activeEdit]);

  const paintBrushOptions = useMemo(() => {
    if (isBusinessFocus) return BUSINESS_STATUS_OPTIONS;
    return STAFF_PAINT_OPTIONS;
  }, [isBusinessFocus]);

  const exitActiveEdit = () => {
    setSelectRangeOpen(false);
    setActiveEdit(null);
  };

  useEffect(() => {
    if (!activeEdit) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (activeEdit.dragging) {
          setActiveEdit((prev) =>
            prev
              ? { ...prev, dragStart: null, dragHover: null, dragging: false }
              : null
          );
        } else {
          exitActiveEdit();
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeEdit]);

  useEffect(() => {
    setActiveEdit(null);
  }, [staffId]);

  useEffect(() => {
    if (isBusinessFocus) {
      if (!canEditRules && visibleStaff.length) {
        setStaffId(visibleStaff[0].id);
      }
      return;
    }
    if (!visibleStaff.length) {
      if (canEditRules) setStaffId(BUSINESS_AVAILABILITY_ID);
      else setStaffId('');
      return;
    }
    if (!visibleStaff.some((member) => member.id === staffId)) {
      setStaffId(visibleStaff[0].id);
    }
  }, [visibleStaff, staffId, isBusinessFocus, canEditRules]);

  const canEditSelected =
    !isBusinessFocus &&
    canEditStaffAvailability({
      user,
      workspace,
      staff,
      staffId
    });

  const canUseActiveEdit = Boolean(
    (isBusinessFocus && canEditRules) || (!isBusinessFocus && (canEditSelected || canEditRules))
  );

  const enterActiveEdit = (brush = 'open') => {
    if (!canUseActiveEdit) return;
    const allowed = paintBrushOptions.some((option) => option.id === brush)
      ? brush
      : paintBrushOptions[0]?.id || 'open';
    setActiveEdit({
      brush: allowed,
      dragStart: null,
      dragHover: null,
      dragging: false
    });
    setSelectRangeOpen(false);
    onStudioSettingsOpenChange?.(false);
  };

  const entry = useMemo(
    () =>
      isBusinessFocus
        ? null
        : normalizeStaffAvailabilityEntry(
            staffAvailability[staffId] || { staffId },
            staffId,
            openTime,
            closeTime
          ),
    [staffAvailability, staffId, openTime, closeTime, isBusinessFocus]
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

  const selectedDayStatus = useMemo(() => {
    if (isBusinessFocus) {
      return isBusinessOpenOnDate(selectedDay, availabilityRules) ? 'open' : 'business-closed';
    }
    return resolveCalendarDayStatus(staffId, selectedDay, { [staffId]: entry }, availabilityRules);
  }, [isBusinessFocus, staffId, selectedDay, entry, availabilityRules]);

  const selectedTimeline = useMemo(() => {
    if (isBusinessFocus) {
      return getBusinessDayTimeline(selectedDay, availabilityRules);
    }
    return getStaffDayTimeline(staffId, selectedDay, { [staffId]: entry }, availabilityRules);
  }, [isBusinessFocus, staffId, selectedDay, entry, availabilityRules]);

  const businessStaffDayMeters = useMemo(() => {
    if (!isBusinessFocus) return [];
    return (staff || []).map((member) => ({
      member,
      timeline: getStaffDayTimeline(
        member.id,
        selectedDay,
        staffAvailability,
        availabilityRules
      )
    }));
  }, [isBusinessFocus, staff, selectedDay, staffAvailability, availabilityRules]);

  const businessTeamAxisMarks = useMemo(() => {
    if (!isBusinessFocus) return [];
    const sample = businessStaffDayMeters[0]?.timeline || selectedTimeline;
    return buildTimelineAxisMarks(sample.dayStart, sample.dayEnd);
  }, [isBusinessFocus, businessStaffDayMeters, selectedTimeline]);

  const selectedDayHours = useMemo(
    () => getBusinessHoursForDate(selectedDay, availabilityRules),
    [selectedDay, availabilityRules]
  );
  const openTimeLabel = selectedDayHours.openTime || '09:00';
  const closeTimeLabel = selectedDayHours.closeTime || '17:00';

  const dayLockedByBusinessClose =
    !isBusinessFocus && selectedDayStatus === 'business-closed';

  const canEditDayTimes =
    !isBusinessFocus &&
    canEditSelected &&
    !dayLockedByBusinessClose &&
    dayDraftStatus === 'open';

  const dayTimesValid =
    dayDraftStatus === 'off' ||
    dayDraftStatus === 'leave' ||
    dayDraftStatus === 'business-closed' ||
    (rangesAreValid(draftShifts) &&
      (draftBreaks.length === 0 || rangesAreValid(draftBreaks)));

  const canSaveDay = isBusinessFocus
    ? Boolean(selectedDay) &&
      canEditRules &&
      (dayDraftStatus === 'open' || dayDraftStatus === 'business-closed')
    : Boolean(staffId && selectedDay) &&
      dayTimesValid &&
      (dayDraftStatus === 'business-closed'
        ? canEditRules
        : canEditSelected && !dayLockedByBusinessClose);

  useEffect(() => {
    if (!selectedDay) return;
    const mapped = mapCalendarStatusToDraft(selectedDayStatus);
    setDayDraftStatus(mapped);
    if (isBusinessFocus) {
      setDraftShifts([]);
      setDraftBreaks([]);
      return;
    }
    if (!staffId || !entry) return;
    const explicit = entry.days?.[selectedDay];
    if (mapped === 'open') {
      if (explicit?.status === 'break') {
        const date = parseDateKey(selectedDay);
        const weekday = date ? WEEKDAY_KEYS[(date.getDay() + 6) % 7] : 'mon';
        const template = entry.weekTemplate?.[weekday];
        setDraftShifts(
          template?.open && template.ranges?.length
            ? template.ranges.map((range) => ({ ...range }))
            : [{ start: openTime, end: closeTime }]
        );
        setDraftBreaks(
          explicit.ranges?.length
            ? explicit.ranges.map((range) => ({ ...range }))
            : [{ start: '12:00', end: '13:00' }]
        );
        return;
      }
      if (
        explicit?.status === 'open' ||
        (explicit?.open &&
          explicit?.status !== 'off' &&
          explicit?.status !== 'leave')
      ) {
        setDraftShifts(
          explicit.ranges?.length
            ? explicit.ranges.map((range) => ({ ...range }))
            : [{ start: openTime, end: closeTime }]
        );
        setDraftBreaks(
          Array.isArray(explicit.breaks)
            ? explicit.breaks.map((range) => ({ ...range }))
            : []
        );
        return;
      }
      const windows = getEffectiveStaffWindows(
        staffId,
        selectedDay,
        { [staffId]: entry },
        availabilityRules
      );
      setDraftShifts(
        windows.length
          ? windows.map((range) => ({ ...range }))
          : [{ start: openTime, end: closeTime }]
      );
      setDraftBreaks([]);
      return;
    }
    setDraftShifts([]);
    setDraftBreaks([]);
  }, [
    staffId,
    selectedDay,
    selectedDayStatus,
    entry,
    availabilityRules,
    openTime,
    closeTime,
    isBusinessFocus
  ]);

  const changeDayStatus = (nextStatus) => {
    if (isBusinessFocus) {
      if (!canEditRules) return;
      if (nextStatus !== 'open' && nextStatus !== 'business-closed') return;
      setDayDraftStatus(nextStatus);
      return;
    }
    if (!canEditSelected) return;
    if (dayLockedByBusinessClose) return;
    setDayDraftStatus(nextStatus);
    if (nextStatus === 'open') {
      const explicit = entry?.days?.[selectedDay];
      if (explicit?.status === 'open' && explicit.ranges?.length) {
        setDraftShifts(explicit.ranges.map((range) => ({ ...range })));
        setDraftBreaks(
          Array.isArray(explicit.breaks)
            ? explicit.breaks.map((range) => ({ ...range }))
            : []
        );
      } else {
        setDraftShifts([{ start: openTime, end: closeTime }]);
        setDraftBreaks([]);
      }
      return;
    }
    setDraftShifts([]);
    setDraftBreaks([]);
  };

  const applyStatusFromSheet = ({ status, startDate, endDate, startTime, endTime }) => {
    if (isBusinessFocus) {
      if (!canEditRules) return;
      if (status === 'business-closed') {
        onUpdateRules?.(applyBusinessClosedToRange(availabilityRules, startDate, endDate, true));
      } else {
        onUpdateRules?.(applyBusinessClosedToRange(availabilityRules, startDate, endDate, false));
      }
      setSelectedDay(startDate);
      setSelectRangeOpen(false);
      return;
    }
    if (!canEditSelected && status !== 'business-closed') return;
    if (status === 'business-closed') {
      if (!canEditRules) return;
      onUpdateRules?.(applyBusinessClosedToRange(availabilityRules, startDate, endDate, true));
      setSelectRangeOpen(false);
      return;
    }
    if (!staffId || !entry) return;
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
    setSelectRangeOpen(false);
  };

  const paintStatusRange = (startDate, endDate, status) => {
    const brush = status || activeEdit?.brush || 'open';
    const span = orderedDateSpan(startDate, endDate);
    if (!span.startKey || !span.endKey) return;
    applyStatusFromSheet({
      status: brush,
      startDate: span.startKey,
      endDate: span.endKey,
      startTime: brush === 'break' ? '12:00' : openTime,
      endTime: brush === 'break' ? '13:00' : closeTime
    });
  };

  const isDayPaintable = (dateKey) =>
    Boolean(dateKey) &&
    isDateWithinAdvanceWindow(dateKey, availabilityRules, { todayKey });

  const resolveDayStatusForPaint = (dateKey) => {
    if (isBusinessFocus) {
      return isBusinessOpenOnDate(dateKey, availabilityRules) ? 'open' : 'business-closed';
    }
    return resolveCalendarDayStatus(
      staffId,
      dateKey,
      { [staffId]: entry },
      availabilityRules
    );
  };

  const nextCycledStatus = (current) => {
    const options = paintBrushOptions;
    if (!options.length) return 'open';
    const idx = options.findIndex((option) => option.id === current);
    return options[(idx + 1) % options.length].id;
  };

  const handlePaintDayClick = (key) => {
    if (!activeEdit || !isDayPaintable(key)) return;
    if (suppressPaintClickRef.current) {
      suppressPaintClickRef.current = false;
      return;
    }
    if (activeEdit.dragging && activeEdit.dragStart) {
      paintStatusRange(activeEdit.dragStart, key, activeEdit.brush);
      setActiveEdit((prev) =>
        prev ? { ...prev, dragStart: null, dragHover: null, dragging: false } : null
      );
      return;
    }
    const current = resolveDayStatusForPaint(key);
    if (!isBusinessFocus && (current === 'business-closed' || current === 'break')) return;
    const next = nextCycledStatus(current);
    setActiveEdit((prev) => (prev ? { ...prev, brush: next } : null));
    paintStatusRange(key, key, next);
  };

  const handlePaintDayDoubleClick = (key) => {
    if (!activeEdit || !isDayPaintable(key)) return;
    suppressPaintClickRef.current = true;
    setActiveEdit((prev) =>
      prev
        ? { ...prev, dragStart: key, dragHover: key, dragging: true }
        : null
    );
  };

  const handlePaintDayEnter = (key) => {
    if (!activeEdit?.dragging || !isDayPaintable(key)) return;
    setActiveEdit((prev) => (prev ? { ...prev, dragHover: key } : null));
  };

  const saveDay = () => {
    if (!selectedDay || !canSaveDay) return;

    if (isBusinessFocus) {
      if (!canEditRules) return;
      onUpdateRules?.(
        applyBusinessClosedToRange(
          availabilityRules,
          selectedDay,
          selectedDay,
          dayDraftStatus === 'business-closed'
        )
      );
      return;
    }

    if (!staffId) return;

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
      if (draftBreaks.length && !rangesAreValid(draftBreaks)) return;
      onSaveEntry?.(
        staffId,
        setStaffDayOverride(
          entry,
          selectedDay,
          {
            status: 'open',
            open: true,
            ranges: draftShifts,
            breaks: draftBreaks,
            source: 'manual'
          },
          openTime,
          closeTime
        )
      );
      return;
    }

    if (dayDraftStatus === 'leave') {
      onSaveEntry?.(
        staffId,
        setStaffDayOverride(
          entry,
          selectedDay,
          {
            status: 'leave',
            open: false,
            ranges: [],
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

  const updateBreak = (index, patch) => {
    if (!canEditDayTimes) return;
    setDraftBreaks((prev) =>
      prev.map((row, i) => (i === index ? { ...row, ...patch } : row))
    );
  };

  const statusLabelForDraft = (status) => {
    if (isBusinessFocus) {
      return status === 'business-closed' ? 'Closed' : 'Available';
    }
    if (status === 'leave') return 'Leave';
    if (status === 'off') return 'Off day';
    return 'Working';
  };

  if (!visibleStaff.length && !canEditRules) {
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
    <div className={`bb-schedule-avail${activeEdit ? ' is-active-edit' : ''}`}>
      {!isBusinessFocus && !canEditSelected && !canEditRules ? (
        <p className="bb-schedule-avail-hint">
          Only you and the owner can edit this staff member&apos;s availability.
        </p>
      ) : null}

      <section className="bb-schedule-avail-panel">
        <div className="bb-schedule-avail-cal-head">
          <div className="bb-schedule-avail-cal-copy">
            <div className="bb-schedule-avail-cal-title-row">
              <h3 className="bb-schedule-avail-title">
                Calendar
                {isBusinessFocus
                  ? ' · Business'
                  : selectedMember?.name
                    ? ` · ${selectedMember.name}`
                    : ''}
              </h3>
              {canUseActiveEdit ? (
                <div className="bb-schedule-avail-edit-tools">
                  <button
                    type="button"
                    className={`bb-schedule-avail-edit-toggle${activeEdit ? ' is-on' : ''}`}
                    role="switch"
                    aria-checked={Boolean(activeEdit)}
                    aria-label="Active edit mode"
                    onClick={() => {
                      if (activeEdit) {
                        setSelectRangeOpen(false);
                        exitActiveEdit();
                      } else {
                        enterActiveEdit('open');
                      }
                    }}
                  >
                    <span className="bb-schedule-avail-edit-toggle-label">Active edit</span>
                    <span className="bb-schedule-avail-edit-toggle-track" aria-hidden="true">
                      <span className="bb-schedule-avail-edit-toggle-knob" />
                    </span>
                  </button>
                  {activeEdit ? (
                    <button
                      type="button"
                      className="bb-schedule-avail-select-range-btn"
                      onClick={() => setSelectRangeOpen(true)}
                    >
                      <CalendarRange size={16} strokeWidth={2.2} aria-hidden="true" />
                      Select range
                    </button>
                  ) : null}
                </div>
              ) : null}
            </div>
            <p className="bb-schedule-avail-window-hint">{bookableWindowLabel}</p>
          </div>
          <div className="bb-schedule-avail-cal-side">
            <div className="bb-schedule-avail-legend" aria-label="Day colors">
              <span className="bb-schedule-avail-legend-item is-open">
                <i /> {isBusinessFocus ? 'Available' : 'Working'}
              </span>
              {isBusinessFocus ? null : (
                <>
                  <span className="bb-schedule-avail-legend-item is-off">
                    <i /> Off day
                  </span>
                  <span className="bb-schedule-avail-legend-item is-leave">
                    <i /> Leave
                  </span>
                </>
              )}
              <span className="bb-schedule-avail-legend-item is-biz-closed">
                <i /> {isBusinessFocus ? 'Closed' : 'Business closed'}
              </span>
            </div>
          </div>
        </div>

        {activeEdit ? (
          <div className="bb-schedule-avail-paint-bar" role="status">
            <div className="bb-schedule-avail-paint-bar-copy">
              <p className="bb-schedule-avail-paint-bar-title">
                {activeEdit.dragging ? 'Pick the end of your range' : 'Click days to toggle status'}
              </p>
              <p className="bb-schedule-avail-paint-bar-hint">
                {activeEdit.dragging
                  ? 'Move to the last day, then click once to fill the range.'
                  : isBusinessFocus
                    ? 'Each click switches a day between Available and Closed. Need a longer stretch? Use Select range above.'
                    : 'Each click switches a day through Working, Off day, and Leave. Need a longer stretch? Use Select range above.'}
              </p>
            </div>
          </div>
        ) : null}

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

        <div
          className={`bb-schedule-picker-grid${activeEdit ? ' is-painting' : ''}${
            activeEdit?.dragging ? ' is-dragging' : ''
          }`}
        >
          {monthDays.map((date) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === monthAnchor.getMonth();
            const inWindow = isDateWithinAdvanceWindow(key, availabilityRules, { todayKey });
            const status = isBusinessFocus
              ? isBusinessOpenOnDate(key, availabilityRules)
                ? 'open'
                : 'business-closed'
              : resolveCalendarDayStatus(staffId, key, { [staffId]: entry }, availabilityRules);
            const previewing = paintPreviewKeys.has(key);
            const displayStatus = previewing
              ? activeEdit.brush
              : status === 'break'
                ? 'open'
                : status;
            const isFocusDay = !activeEdit && key === selectedDay;
            const paintable = Boolean(activeEdit) && inWindow;
            return (
              <button
                key={key}
                type="button"
                className={`bb-schedule-picker-day is-${displayStatus}${
                  isFocusDay ? ' is-selected' : ''
                }${inMonth ? '' : ' is-outside'}${inWindow ? '' : ' is-outside-window'}${
                  previewing ? ' is-paint-preview' : ''
                }${paintable ? ' is-paintable' : ''}`}
                aria-label={`${formatDisplayDate(key)}, ${statusTileLabel(
                  displayStatus,
                  isBusinessFocus
                )}`}
                disabled={Boolean(activeEdit) && !inWindow}
                onClick={() => {
                  if (activeEdit) {
                    handlePaintDayClick(key);
                    return;
                  }
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
                onDoubleClick={(event) => {
                  if (!activeEdit) return;
                  event.preventDefault();
                  handlePaintDayDoubleClick(key);
                }}
                onPointerEnter={() => handlePaintDayEnter(key)}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>

        {isBusinessFocus ? (
          <div className="bb-schedule-day-meter-block bb-schedule-staff-meters">
            <div className="bb-schedule-day-meter-block-head">
              <p className="bb-schedule-avail-day-section-label m-0">
                {formatDisplayDate(selectedDay)} · Team
              </p>
              <span className="bb-schedule-day-meter-hours">
                {openTimeLabel} – {closeTimeLabel}
              </span>
            </div>
            {businessStaffDayMeters.length === 0 ? (
              <p className="bb-schedule-avail-hint m-0 text-sm">No staff on the roster yet.</p>
            ) : (
              <>
                <div className="bb-schedule-staff-meters-list">
                  {businessStaffDayMeters.map(({ member, timeline }) => {
                    const photo = staffPhoto(member);
                    return (
                      <div key={member.id} className="bb-schedule-staff-meter-row">
                        <div className="bb-schedule-staff-meter-person">
                          <span
                            className="bb-schedule-staff-meter-avatar"
                            style={{ '--staff-color': member.color || '#101828' }}
                            aria-hidden="true"
                          >
                            {photo ? (
                              <img src={photo} alt="" />
                            ) : (
                              staffInitials(member.name)
                            )}
                          </span>
                          <span className="bb-schedule-staff-meter-name">{member.name}</span>
                        </div>
                        <DayTimelineMeter
                          segments={timeline.segments}
                          status={timeline.status}
                          dayStart={timeline.dayStart}
                          dayEnd={timeline.dayEnd}
                          showAxis={false}
                        />
                      </div>
                    );
                  })}
                </div>
                {businessTeamAxisMarks.length ? (
                  <div className="bb-schedule-staff-meters-axis-wrap" aria-hidden="true">
                    <div className="bb-schedule-staff-meters-axis-spacer" />
                    <div className="bb-schedule-day-meter-axis">
                      {businessTeamAxisMarks.map((mark) => (
                        <span
                          key={`${mark.minutes}-${mark.edge}`}
                          className={`bb-schedule-day-meter-tick is-${mark.edge}`}
                          style={{ left: `${mark.leftPct}%` }}
                        >
                          <i />
                          <em>{mark.label}</em>
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="bb-schedule-day-meter-legend" aria-hidden="true">
                  <span className="bb-schedule-day-meter-legend-item is-open">
                    <i /> Working
                  </span>
                  <span className="bb-schedule-day-meter-legend-item is-break">
                    <i /> Break
                  </span>
                  <span className="bb-schedule-day-meter-legend-item is-off">
                    <i /> Off day
                  </span>
                  <span className="bb-schedule-day-meter-legend-item is-leave">
                    <i /> Leave
                  </span>
                </div>
              </>
            )}
          </div>
        ) : (
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
                    <i /> Working
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
                  ? 'Leave — no bookable hours.'
                  : selectedTimeline.status === 'off'
                    ? 'Off day — no bookable hours.'
                    : selectedTimeline.status === 'business-closed'
                      ? 'Business closed this day.'
                      : 'No shift windows on this day.'}
              </p>
            )}
          </div>
        )}
      </section>

      <section className="bb-schedule-avail-panel bb-schedule-avail-day-panel">
        <div className="bb-schedule-avail-shifts-head">
          <h3 className="bb-schedule-avail-title">
            {formatDisplayDate(selectedDay)} · Day
          </h3>
          <span
            className={`bb-schedule-avail-day-status-chip is-${dayDraftStatus}`}
          >
            {statusLabelForDraft(dayDraftStatus)}
          </span>
        </div>

        {isBusinessFocus ? (
          canEditRules ? (
            <>
              <div className="bb-schedule-avail-day-toolbar">
                <button
                  type="button"
                  className="bb-schedule-avail-day-tool-btn"
                  onClick={() => setDayStatusSheetOpen(true)}
                >
                  Change status
                </button>
              </div>
              <p className="bb-schedule-avail-hint">
                {dayDraftStatus === 'business-closed'
                  ? 'Marks the whole business closed on this date.'
                  : 'Available follows weekly open days and overall business hours.'}
              </p>
              <div className="bb-schedule-avail-day-actions">
                <span className="bb-schedule-avail-hint">Save to apply this day’s status.</span>
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
          ) : (
            <p className="bb-schedule-avail-hint">
              Only the owner can edit overall business availability.
            </p>
          )
        ) : !canEditSelected && !canEditRules ? (
          <p className="bb-schedule-avail-hint">
            Only you and the owner can edit this staff member&apos;s availability.
          </p>
        ) : dayLockedByBusinessClose ? (
          <p className="bb-schedule-avail-hint">
            Business is closed this day. Ask the owner to reopen it before editing staff availability.
          </p>
        ) : (
          <>
            <div className="bb-schedule-avail-day-toolbar">
              <button
                type="button"
                className="bb-schedule-avail-day-tool-btn"
                onClick={() => setDayStatusSheetOpen(true)}
              >
                Change status
              </button>
              {canEditDayTimes ? (
                <>
                  <button
                    type="button"
                    className="bb-schedule-avail-day-tool-btn is-break"
                    onClick={() =>
                      setDraftBreaks((prev) => [...prev, { start: '12:00', end: '13:00' }])
                    }
                  >
                    <Plus size={15} strokeWidth={2.3} aria-hidden="true" />
                    Add break
                  </button>
                  <button
                    type="button"
                    className="bb-schedule-avail-day-tool-btn is-shift"
                    onClick={() =>
                      setDraftShifts((prev) => [
                        ...prev,
                        { start: openTime, end: closeTime }
                      ])
                    }
                  >
                    <Plus size={15} strokeWidth={2.3} aria-hidden="true" />
                    Add shift
                  </button>
                </>
              ) : null}
            </div>

            {canEditDayTimes ? (
              <div className="bb-schedule-avail-day-feed" aria-label="Shifts and breaks">
                {draftShifts.map((shift, index) => (
                  <div key={`shift-${index}`} className="bb-schedule-avail-day-feed-item is-shift">
                    <div className="bb-schedule-avail-day-feed-item-head">
                      <span className="bb-schedule-avail-day-feed-tag">Shift</span>
                      {draftShifts.length > 1 ? (
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
                      ) : null}
                    </div>
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
                  </div>
                ))}
                {draftBreaks.map((row, index) => (
                  <div key={`break-${index}`} className="bb-schedule-avail-day-feed-item is-break">
                    <div className="bb-schedule-avail-day-feed-item-head">
                      <span className="bb-schedule-avail-day-feed-tag">Break</span>
                      <button
                        type="button"
                        className="bb-ghost-btn bb-schedule-avail-shift-remove"
                        aria-label={`Remove break ${index + 1}`}
                        onClick={() =>
                          setDraftBreaks((prev) => prev.filter((_, i) => i !== index))
                        }
                      >
                        <Trash2 size={15} strokeWidth={2.2} />
                      </button>
                    </div>
                    <div className="bb-schedule-avail-shift-times">
                      <TimeField
                        label="Start"
                        value={row.start}
                        onChange={(next) => updateBreak(index, { start: next })}
                      />
                      <TimeField
                        label="End"
                        value={row.end}
                        onChange={(next) => updateBreak(index, { end: next })}
                      />
                    </div>
                  </div>
                ))}
                {!draftShifts.length && !draftBreaks.length ? (
                  <p className="bb-schedule-avail-hint m-0">
                    No shifts or breaks yet. Add a shift to open bookable hours.
                  </p>
                ) : null}
              </div>
            ) : (
              <p className="bb-schedule-avail-hint">
                {dayDraftStatus === 'leave'
                  ? 'Leave — no bookable hours for this staff member.'
                  : 'Off day — no bookable hours for this staff member.'}
              </p>
            )}

            <div className="bb-schedule-avail-day-actions">
              <span className="bb-schedule-avail-hint">
                {dayDraftStatus === 'open'
                  ? 'Save to apply this day’s shifts and breaks.'
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

      {studioSettingsOpen && canEditRules ? (
        <AvailabilityStudioSettingsSheet
          availabilityRules={availabilityRules}
          onUpdateRules={onUpdateRules}
          showBusinessHours={isBusinessFocus}
          onClose={() => onStudioSettingsOpenChange?.(false)}
        />
      ) : null}

      {dayStatusSheetOpen ? (
        <ChangeDayStatusSheet
          businessOnly={isBusinessFocus}
          currentStatus={dayDraftStatus}
          onClose={() => setDayStatusSheetOpen(false)}
          onApply={changeDayStatus}
        />
      ) : null}

      {selectRangeOpen && activeEdit && canUseActiveEdit ? (
        <SelectRangeSheet
          staffName={isBusinessFocus ? 'Business' : selectedMember?.name}
          openTime={openTime}
          closeTime={closeTime}
          initialDay={selectedDay}
          businessOnly={isBusinessFocus}
          onClose={() => setSelectRangeOpen(false)}
          onApply={(payload) => {
            applyStatusFromSheet(payload);
            setSelectRangeOpen(false);
          }}
        />
      ) : null}
    </div>
  );
}
