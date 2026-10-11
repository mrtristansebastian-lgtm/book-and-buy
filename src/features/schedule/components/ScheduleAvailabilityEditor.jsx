import { Button } from '../../../shared/ui/Button';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useElementWidth } from '../../../shared/ui/useElementWidth';
import { CalendarRange, Trash2, Clock } from 'lucide-react';
import { listActiveShifts, removeActiveShift } from '../utils/activeShifts';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { TimeField } from '../../../shared/ui/TimeField';
import { getMaxBookableDateKey, isDateWithinAdvanceWindow } from '../../../utils/availability';
import { formatDisplayDate, parseDateKey, toDateKey } from '../../../utils/dates';
import {
  canEditAvailabilityRules,
  canEditStaffAvailability,
  getVisibleStaffForAvailability
} from '../../../utils/staffAccess';
import {
  WEEKDAY_KEYS,
  BUSINESS_AVAILABILITY_ID,
  applyBusinessClosedToRange,
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
import { AvailabilityMonthGrid } from './AvailabilityMonthGrid';
import { DayTimelineMeter, buildTimelineAxisMarks } from './DayTimelineMeter';
import { ApplyDayStatusDatesSheet } from './ApplyDayStatusDatesSheet';
import { ApplyShiftDatesSheet } from './ApplyShiftDatesSheet';
import { StaffAvailabilitySwitcher } from './StaffAvailabilitySwitcher';
import {
  BUSINESS_STATUS_OPTIONS,
  STAFF_PAINT_OPTIONS,
  formatWindowDate,
  sameMonth,
  clampMonthAnchor,
  mapCalendarStatusToDraft,
  rangesAreValid,
  staffInitials,
  staffPhoto
} from './availabilityEditorUtils';

export { BUSINESS_AVAILABILITY_ID };
export { StaffAvailabilitySwitcher };

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
  const [teamAxisRef, teamAxisWidth] = useElementWidth();
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
  const [dayDraftStatus, setDayDraftStatus] = useState('open');
  const [draftShifts, setDraftShifts] = useState([{ start: openTime, end: closeTime }]);
  const [draftBreaks, setDraftBreaks] = useState([]);
  const [dayStatusSheetOpen, setDayStatusSheetOpen] = useState(false);
  const [applyShiftIndex, setApplyShiftIndex] = useState(null);
  const shiftEditorRef = useRef(null);
  const [deleteShiftKey, setDeleteShiftKey] = useState('');
  const [shiftListPage, setShiftListPage] = useState(0);
  const [saveNotice, setSaveNotice] = useState(null);
  const saveNoticeTimerRef = useRef(null);

  const showSaveNotice = (title, detail = '') => {
    if (saveNoticeTimerRef.current) {
      window.clearTimeout(saveNoticeTimerRef.current);
    }
    setSaveNotice({ title, detail });
    saveNoticeTimerRef.current = window.setTimeout(() => {
      setSaveNotice(null);
      saveNoticeTimerRef.current = null;
    }, 2800);
  };

  useEffect(() => { setDayStatusSheetOpen(false); setBulkDayStatus('open'); }, [staffId]);

  useEffect(
    () => () => {
      if (saveNoticeTimerRef.current) window.clearTimeout(saveNoticeTimerRef.current);
    },
    []
  );

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

  const canApplyDayStatus = Boolean(
    (isBusinessFocus && canEditRules) || (!isBusinessFocus && canEditSelected)
  );

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

  const selectedMember = staff.find((member) => member.id === staffId);
  const todayKey = toDateKey(new Date());
  const maxBookableDateKey = useMemo(
    () => getMaxBookableDateKey(availabilityRules, todayKey),
    [availabilityRules, todayKey]
  );
  const activeShifts = useMemo(() => listActiveShifts(staffId, entry, availabilityRules, monthAnchor, todayKey, maxBookableDateKey), [staffId, entry, availabilityRules, monthAnchor, todayKey, maxBookableDateKey]);
  useEffect(() => setDeleteShiftKey(''), [staffId, entry, monthAnchor]);
  useEffect(() => setShiftListPage(0), [staffId, monthAnchor]);
  const shiftPageCount = Math.max(1, Math.ceil(activeShifts.length / 6));
  const safeShiftListPage = Math.min(shiftListPage, shiftPageCount - 1);
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
    return buildTimelineAxisMarks(sample.dayStart, sample.dayEnd, teamAxisWidth || 120);
  }, [isBusinessFocus, businessStaffDayMeters, selectedTimeline, teamAxisWidth]);

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

  const statusLabelForDraft = (status) => {
    if (isBusinessFocus) {
      return status === 'business-closed' ? 'Closed' : 'Available';
    }
    if (status === 'leave') return 'Leave';
    if (status === 'off') return 'Off day';
    if (status === 'business-closed') return 'Business closed';
    return 'Working';
  };

  const dayStatusOptions = isBusinessFocus ? BUSINESS_STATUS_OPTIONS : STAFF_PAINT_OPTIONS;
  const [bulkDayStatus, setBulkDayStatus] = useState('open');
  const applyDayStatusToDates = ({ dates, status }) => {
    const allowed = isBusinessFocus ? ['open', 'business-closed'] : ['open', 'off', 'leave'];
    if (!allowed.includes(status) || !canApplyDayStatus) return;
    const applicable = [...new Set(dates)].filter(key => isDateWithinAdvanceWindow(key, availabilityRules, { todayKey }) && (isBusinessFocus || isBusinessOpenOnDate(key, availabilityRules)));
    if (!applicable.length) return;
    if (isBusinessFocus) {
      if (!canEditRules) return;
      onUpdateRules?.(applicable.reduce((rules, key) => applyBusinessClosedToRange(rules, key, key, status === 'business-closed'), availabilityRules));
    } else {
      if (!canEditSelected || !entry) return;
      const next = applicable.reduce((current, key) => {
        const existing = current.days?.[key];
        const hours = getBusinessHoursForDate(key, availabilityRules);
        return setStaffDayOverride(current, key, { status, open: status === 'open', ranges: status === 'open' ? existing?.status === 'open' && existing.ranges?.length ? existing.ranges : [{ start: hours.openTime || openTime, end: hours.closeTime || closeTime }] : [], breaks: status === 'open' && existing?.status === 'open' ? existing.breaks || [] : [], source: 'manual' }, openTime, closeTime);
      }, entry);
      onSaveEntry?.(staffId, next);
    }
    setSelectedDay(applicable[0]);
    setDayStatusSheetOpen(false);
    showSaveNotice('Day status applied', `${statusLabelForDraft(status)} · ${applicable.length} ${applicable.length === 1 ? 'day' : 'days'}`);
  };

  const saveDay = (overrides = {}) => {
    const status = overrides.status ?? dayDraftStatus;
    const shifts = overrides.shifts ?? draftShifts;
    const breaks = overrides.breaks ?? draftBreaks;
    if (!selectedDay) return;
    if (overrides.status == null && !canSaveDay) return;

    const dayLabel = formatDisplayDate(selectedDay);
    const statusName = statusLabelForDraft(status);

    if (isBusinessFocus) {
      if (!canEditRules) return;
      if (status !== 'open' && status !== 'business-closed') return;
      onUpdateRules?.(
        applyBusinessClosedToRange(
          availabilityRules,
          selectedDay,
          selectedDay,
          status === 'business-closed'
        )
      );
      showSaveNotice('Day saved', `${statusName} · ${dayLabel}`);
      return;
    }

    if (!staffId) return;

    if (status === 'business-closed') {
      if (!canEditRules) return;
      onUpdateRules?.(
        applyBusinessClosedToRange(availabilityRules, selectedDay, selectedDay, true)
      );
      showSaveNotice('Day saved', `${statusName} · ${dayLabel}`);
      return;
    }

    if (!canEditSelected) return;

    if (canEditRules && selectedDayStatus === 'business-closed') {
      onUpdateRules?.(
        applyBusinessClosedToRange(availabilityRules, selectedDay, selectedDay, false)
      );
    }

    if (status === 'open') {
      if (!rangesAreValid(shifts)) return;
      if (breaks.length && !rangesAreValid(breaks)) return;
      onSaveEntry?.(
        staffId,
        setStaffDayOverride(
          entry,
          selectedDay,
          {
            status: 'open',
            open: true,
            ranges: shifts,
            breaks,
            source: 'manual'
          },
          openTime,
          closeTime
        )
      );
      showSaveNotice('Day saved', `${statusName} · ${dayLabel}`);
      return;
    }

    if (status === 'leave') {
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
      showSaveNotice('Day saved', `${statusName} · ${dayLabel}`);
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
    showSaveNotice('Day saved', `${statusName} · ${dayLabel}`);
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

  const applyShiftToDates = ({ dates = [], shift }) => {
    if (!staffId || !entry || !canEditSelected || !shift?.start || !shift?.end) return;
    let nextEntry = entry;
    const eligibleDates = dates.filter((dateKey) => isDateWithinAdvanceWindow(dateKey, availabilityRules, { todayKey }) && isBusinessOpenOnDate(dateKey, availabilityRules));
    eligibleDates.forEach((dateKey) => {
      const existing = entry.days?.[dateKey];
      const nextBreaks = Array.isArray(existing?.breaks)
        ? existing.breaks.map((range) => ({ ...range }))
        : [];
      nextEntry = setStaffDayOverride(
        nextEntry,
        dateKey,
        {
          status: 'open',
          open: true,
          ranges: [{ ...shift }],
          breaks: nextBreaks,
          source: 'manual'
        },
        openTime,
        closeTime
      );
    });
    if (nextEntry !== entry) onSaveEntry?.(staffId, nextEntry);
    setApplyShiftIndex(null);
    if (eligibleDates.length) {
      setSelectedDay(eligibleDates[0]);
      showSaveNotice('Shift applied', `${shift.start} – ${shift.end} · ${eligibleDates.length} ${eligibleDates.length === 1 ? 'day' : 'days'}`);
    }
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
    <div className="bb-schedule-avail">
      {availabilityRules.scheduleMode === 'first_come' && <p className="bb-panel p-3 text-sm" role="status"><strong>First come, first served is on.</strong> Appointment clients submit requests without choosing a time. Manage the queue in Bookings; publishing hours and staff shifts is optional. Fixed sessions keep their dates and capacity.</p>}
      {!isBusinessFocus && !canEditSelected && !canEditRules ? (
        <p className="bb-schedule-avail-hint">
          Only you and the owner can edit this staff member&apos;s availability.
        </p>
      ) : null}

      <div className="bb-schedule-workspace bb-schedule-availability-workspace">
        <aside className="bb-schedule-sidebar bb-schedule-availability-sidebar" aria-label="Availability controls">
          <label className="bb-schedule-mobile-staff bb-availability-mobile-profile">
            <span>Availability for</span>
            <select aria-label="Availability for" value={staffId} onChange={(event) => setStaffId(event.target.value)}>
              {canEditRules ? <option value={BUSINESS_AVAILABILITY_ID}>Business hours</option> : null}
              {visibleStaff.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}
              {!canEditRules && !visibleStaff.length ? <option value="">No staff available</option> : null}
            </select>
          </label>
          <section className="bb-schedule-side-section">
            <span className="bb-schedule-side-label">Staff availability</span>
            <div className="bb-schedule-staff-filter" role="tablist" aria-label="Availability profile">
              {canEditRules ? (
                <button
                  type="button"
                  role="tab"
                  aria-selected={isBusinessFocus}
                  className={`bb-schedule-staff-avatar${isBusinessFocus ? ' is-active' : ''}`}
                  onClick={() => setStaffId(BUSINESS_AVAILABILITY_ID)}
                >
                  <span className="bb-schedule-staff-avatar-face is-all" aria-hidden="true">All</span>
                  <span className="bb-schedule-staff-avatar-name">Business hours</span>
                </button>
              ) : null}
              {visibleStaff.map((member) => {
                const photo = staffPhoto(member);
                const active = member.id === staffId;
                return (
                  <button
                    key={member.id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    className={`bb-schedule-staff-avatar${active ? ' is-active' : ''}`}
                    style={{ '--staff-color': member.color || '#101828' }}
                    onClick={() => setStaffId(member.id)}
                  >
                    <span className="bb-schedule-staff-avatar-face" aria-hidden="true">
                      {photo ? <img src={photo} alt="" /> : staffInitials(member.name)}
                    </span>
                    <span className="bb-schedule-staff-avatar-name">{member.name}</span>
                  </button>
                );
              })}
            </div>
          </section>
          <section className="bb-schedule-side-section bb-schedule-availability-window">
            <span className="bb-schedule-side-label">Booking period</span>
            <strong>{bookableWindowLabel.replace('Availability period · ', '')}</strong>
          </section>
        </aside>
        <main className="bb-schedule-main bb-schedule-avail-content">
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

        <AvailabilityMonthGrid
          monthAnchor={monthAnchor}
          selectedDay={selectedDay}
          activeEdit={false}
          canGoPrevious={canGoPrevMonth}
          canGoNext={canGoNextMonth}
          onPreviousMonth={() =>
            setMonthAnchor((prev) =>
              clampMonthAnchor(
                new Date(prev.getFullYear(), prev.getMonth() - 1, 1),
                todayKey,
                maxBookableDateKey
              )
            )
          }
          onNextMonth={() =>
            setMonthAnchor((prev) =>
              clampMonthAnchor(
                new Date(prev.getFullYear(), prev.getMonth() + 1, 1),
                todayKey,
                maxBookableDateKey
              )
            )
          }
          resolveStatus={(key) =>
            isBusinessFocus
              ? isBusinessOpenOnDate(key, availabilityRules)
                ? 'open'
                : 'business-closed'
              : resolveCalendarDayStatus(staffId, key, { [staffId]: entry }, availabilityRules)
          }
          isDateEnabled={(key) =>
            isDateWithinAdvanceWindow(key, availabilityRules, { todayKey })
          }
          onSelectDay={(key, date) => {
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
        />

          <section className="bb-schedule-side-section bb-schedule-shifts-below-calendar bb-day-status-section" aria-label="Day status">
            <div className="bb-schedule-avail-sidebar-head"><div className="bb-shift-editor-heading"><h3 className="bb-shift-editor-title">Day status</h3><p className="bb-schedule-avail-hint m-0">Choose a status, then apply it to one or more dates.</p></div></div>
            <div className="bb-day-status-actions"><div className="bb-schedule-avail-status" role="group" aria-label="Choose day status">{dayStatusOptions.map(option => <FilterChip key={option.id} selected={bulkDayStatus === option.id} disabled={!canApplyDayStatus} className={`bb-schedule-avail-status-btn is-paint is-${option.id}`} onClick={() => setBulkDayStatus(option.id)}>{option.label}</FilterChip>)}</div><Button action="calendar" variant="secondary" disabled={!canApplyDayStatus} onClick={() => setDayStatusSheetOpen(true)}>Apply status to dates</Button></div>
          </section>

          {!isBusinessFocus ? (
            <section ref={shiftEditorRef} className="bb-schedule-side-section bb-schedule-shifts-below-calendar" aria-label="Edit shifts and breaks">
              <div className="bb-schedule-avail-sidebar-head">
                <div className="bb-shift-editor-heading"><div className="bb-shift-editor-title-row"><h3 className="bb-shift-editor-title">Shifts &amp; breaks</h3><span className="bb-shift-editor-date"><CalendarRange size={16} aria-hidden="true" />{formatDisplayDate(selectedDay)}</span></div><p className="bb-schedule-avail-hint m-0">Working hours and breaks · {workspace.timezone || 'Business timezone'}</p></div>
              </div>

              {draftShifts.length ? draftShifts.map((shift, index) => (
                <div key={`sidebar-shift-${index}`} className="bb-schedule-avail-sidebar-shift">
                  <div className="bb-schedule-avail-sidebar-shift-head">
                    <span>Shift {index + 1}</span>
                    {draftShifts.length > 1 ? (
                      <button type="button" className="bb-schedule-avail-sidebar-remove" aria-label={`Remove shift ${index + 1}`} onClick={() => setDraftShifts((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>
                        <Trash2 size={14} aria-hidden="true" />
                      </button>
                    ) : null}
                  </div>
                  {canEditDayTimes ? (
                    <div className="bb-schedule-avail-sidebar-times is-shift">
                      <TimeField label="Start" value={shift.start} onChange={(next) => updateShift(index, { start: next })} />
                      <TimeField label="End" value={shift.end} onChange={(next) => updateShift(index, { end: next })} />
                    </div>
                  ) : <strong>{shift.start} – {shift.end}</strong>}
                  {canEditDayTimes ? (
                    <Button action="apply" variant="primary" type="button" className="bb-schedule-avail-sidebar-apply" onClick={() => setApplyShiftIndex(index)}>
                       Apply this shift to dates
                    </Button>
                  ) : null}
                </div>
              )) : <p className="bb-schedule-avail-hint m-0">No shift set for this day.</p>}
              {canEditDayTimes && draftBreaks.length ? (
                <div className="bb-schedule-avail-sidebar-breaks">
                  {draftBreaks.map((row, index) => (
                    <div key={`sidebar-break-${index}`} className="bb-schedule-avail-sidebar-shift is-break">
                      <div className="bb-schedule-avail-sidebar-shift-head">
                        <span>Break {index + 1}</span>
                        <button type="button" className="bb-schedule-avail-sidebar-remove" aria-label={`Remove break ${index + 1}`} onClick={() => setDraftBreaks((previous) => previous.filter((_, itemIndex) => itemIndex !== index))}>
                          <Trash2 size={14} aria-hidden="true" />
                        </button>
                      </div>
                      <div className="bb-schedule-avail-sidebar-times">
                        <TimeField label="Start" value={row.start} onChange={(next) => updateBreak(index, { start: next })} />
                        <TimeField label="End" value={row.end} onChange={(next) => updateBreak(index, { end: next })} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
              {canEditDayTimes ? (
                <>
                  <div className="bb-schedule-avail-sidebar-add-row">
                    <Button action="add" variant="primary" type="button" className="bb-schedule-avail-sidebar-action" onClick={() => setDraftShifts((prev) => [...prev, { start: openTime, end: closeTime }])}>
                       Shift
                    </Button>
                    <Button action="add" variant="primary" type="button" className="bb-schedule-avail-sidebar-action" onClick={() => setDraftBreaks((prev) => [...prev, { start: '12:00', end: '13:00' }])}>
                       Break
                    </Button>
                  </div>
                  <Button action="save" variant="primary" type="button" className="bb-primary-btn bb-schedule-avail-sidebar-save" disabled={!canSaveDay} onClick={() => saveDay()}>
                    Save day
                  </Button>
                </>
              ) : null}
            </section>
          ) : null}
          {!isBusinessFocus ? (
            <section className="bb-active-shifts" aria-label="Active shifts">
              <header><div><h3>Active shifts</h3><p>{monthAnchor.toLocaleDateString('en', { month: 'long', year: 'numeric' })} · {selectedMember?.name || 'Selected staff'} · {workspace.timezone || 'Business timezone'}</p></div><span>{activeShifts.length} shift{activeShifts.length === 1 ? '' : 's'}</span></header>
              <p className="bb-schedule-avail-hint m-0">Upcoming shifts in this calendar month. Editing or deleting here changes this date only; existing bookings remain unchanged.</p>
              {activeShifts.length ? <ul>{activeShifts.slice(safeShiftListPage * 6, (safeShiftListPage + 1) * 6).map((row) => {
                const key = `${row.date}:${row.index}`;
                const confirming = deleteShiftKey === key;
                return <li key={key}>
                  <span className="bb-active-shift-icon"><Clock size={18} aria-hidden="true" /></span>
                  <div className="bb-active-shift-copy"><strong>{formatDisplayDate(row.date)}</strong><span>{row.start} – {row.end}</span><small>{row.recurring ? 'Weekly schedule' : 'Date-specific shift'}{row.breaks.length ? ` · ${row.breaks.length} break${row.breaks.length === 1 ? '' : 's'}` : ''}</small></div>
                  {canEditSelected ? <div className="bb-active-shift-actions">
                    <Button action="edit" variant="secondary" type="button" className="bb-ghost-btn" aria-label={`Edit shift ${row.start} on ${row.date}`} onClick={() => { setSelectedDay(row.date); shiftEditorRef.current?.scrollIntoView({ block: 'center', behavior: 'auto' }); shiftEditorRef.current?.querySelector('input, button, select')?.focus({ preventScroll: true }); }}> Edit</Button>
                    <Button action="delete" variant="destructive" type="button" className="bb-ghost-btn" aria-label={`Delete shift ${row.start} on ${row.date}`} onClick={() => setDeleteShiftKey(confirming ? '' : key)}> Delete</Button>
                  </div> : null}
                  {confirming ? <div className="bb-active-shift-confirm" role="group" aria-label="Confirm shift deletion"><span>Remove {row.start}–{row.end} on {formatDisplayDate(row.date)}?{row.ranges.length === 1 ? ' This marks the staff member off for this day.' : ''}</span><Button action="cancel" variant="secondary" type="button" className="bb-ghost-btn" onClick={() => setDeleteShiftKey('')}>Cancel</Button><Button action="delete" variant="destructive" type="button" className="bb-ghost-btn" onClick={() => { if (!canEditSelected) return; onSaveEntry?.(staffId, removeActiveShift(entry, row, availabilityRules)); setDeleteShiftKey(''); }}>Remove shift</Button></div> : null}
                </li>;
              })}</ul> : <div className="bb-active-shifts-empty"><CalendarRange size={22} /><strong>No upcoming shifts this month</strong><span>Choose a working date above and add a shift, or move to another month.</span></div>}
              {shiftPageCount > 1 ? <nav className="bb-active-shifts-pagination" aria-label="Shift list pages"><span>{safeShiftListPage * 6 + 1}–{Math.min((safeShiftListPage + 1) * 6, activeShifts.length)} of {activeShifts.length}</span><Button action="back" variant="secondary" type="button" className="bb-ghost-btn" disabled={safeShiftListPage === 0} onClick={() => { setShiftListPage(safeShiftListPage - 1); setDeleteShiftKey(''); }}>Previous shifts</Button><Button action="continue" variant="secondary" type="button" className="bb-ghost-btn" disabled={safeShiftListPage === shiftPageCount - 1} onClick={() => { setShiftListPage(safeShiftListPage + 1); setDeleteShiftKey(''); }}>Next shifts</Button></nav> : null}
            </section>
          ) : null}
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
                    <div ref={teamAxisRef} className="bb-schedule-day-meter-axis">
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
          <StatusBadge
            className={`bb-schedule-avail-day-status-chip is-${dayDraftStatus}`}
            status={dayDraftStatus}
            label={statusLabelForDraft(dayDraftStatus)}
          />
        </div>

        {isBusinessFocus ? (
          canEditRules ? (
            <>
              <div className="bb-schedule-avail-day-toolbar">
                <Button action="settings" variant="secondary"
                  type="button"
                  className="bb-schedule-avail-day-tool-btn"
                  onClick={() => setDayStatusSheetOpen(true)}
                >
                  Change status
                </Button>
              </div>
              <p className="bb-schedule-avail-hint">
                {dayDraftStatus === 'business-closed'
                  ? 'Marks the whole business closed on this date. Change status saves immediately.'
                  : 'Available follows weekly open days and overall business hours. Change status saves immediately.'}
              </p>
              <div className="bb-schedule-avail-day-actions">
                <span className="bb-schedule-avail-hint">Or confirm again below.</span>
                <Button action="save" variant="primary"
                  type="button"
                  className="bb-primary-btn"
                  disabled={!canSaveDay}
                  onClick={() => saveDay()}
                >
                  Save changes
                </Button>
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
              <Button action="settings" variant="secondary"
                type="button"
                className="bb-schedule-avail-day-tool-btn"
                onClick={() => setDayStatusSheetOpen(true)}
              >
                Change status
              </Button>
              {canEditDayTimes ? (
                <>
                  <Button action="add" variant="primary"
                    type="button"
                    className="bb-schedule-avail-day-tool-btn is-break"
                    onClick={() =>
                      setDraftBreaks((prev) => [...prev, { start: '12:00', end: '13:00' }])
                    }
                  >

                    Add break
                  </Button>
                  <Button action="add" variant="primary"
                    type="button"
                    className="bb-schedule-avail-day-tool-btn is-shift"
                    onClick={() =>
                      setDraftShifts((prev) => [
                        ...prev,
                        { start: openTime, end: closeTime }
                      ])
                    }
                  >

                    Add shift
                  </Button>
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
                  ? 'Change status saves immediately. Save again after editing shifts or breaks.'
                  : 'Change status saves immediately.'}
              </span>
              <Button action="save" variant="primary"
                type="button"
                className="bb-primary-btn"
                disabled={!canSaveDay}
                onClick={() => saveDay()}
              >
                Save changes
              </Button>
            </div>
          </>
        )}
      </section>

        </main>
      </div>

      {studioSettingsOpen && canEditRules ? (
        <AvailabilityStudioSettingsSheet
          availabilityRules={availabilityRules}
          onUpdateRules={(patch) => {
            onUpdateRules?.(patch);
            showSaveNotice('Settings saved', 'Availability rules are up to date.');
          }}
          showBusinessHours={isBusinessFocus}
          onClose={() => onStudioSettingsOpenChange?.(false)}
        />
      ) : null}

      {dayStatusSheetOpen && canApplyDayStatus ? <ApplyDayStatusDatesSheet initialDay={selectedDay} status={bulkDayStatus} statusLabel={statusLabelForDraft(bulkDayStatus)} businessOnly={isBusinessFocus} availabilityRules={availabilityRules} resolveStatus={key => isBusinessFocus ? isBusinessOpenOnDate(key, availabilityRules) ? 'open' : 'business-closed' : resolveCalendarDayStatus(staffId, key, { [staffId]: entry }, availabilityRules)} onClose={() => setDayStatusSheetOpen(false)} onApply={applyDayStatusToDates}/> : null}

      {applyShiftIndex != null && !isBusinessFocus && canEditDayTimes && draftShifts[applyShiftIndex] ? (
        <ApplyShiftDatesSheet
          initialDay={selectedDay}
          shift={draftShifts[applyShiftIndex]}
          availabilityRules={availabilityRules}
          resolveStatus={(key) => resolveCalendarDayStatus(staffId, key, { [staffId]: entry }, availabilityRules)}
          onClose={() => setApplyShiftIndex(null)}
          onApply={applyShiftToDates}
        />
      ) : null}

      {saveNotice ? (
        <div className="bb-schedule-avail-toast" role="status" aria-live="polite">
          <div className="bb-schedule-avail-toast-card">
            <strong className="bb-schedule-avail-toast-title">{saveNotice.title}</strong>
            {saveNotice.detail ? (
              <p className="bb-schedule-avail-toast-detail">{saveNotice.detail}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
