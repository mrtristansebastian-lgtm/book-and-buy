import { useEffect, useMemo, useRef, useState } from 'react';
import { CalendarRange, ChevronLeft, ChevronRight, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { TimeField } from '../../../shared/ui/TimeField';
import { getMaxBookableDateKey, isDateWithinAdvanceWindow } from '../../../utils/availability';
import {
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
import { ChangeDayStatusSheet } from './ChangeDayStatusSheet';
import { SelectRangeSheet } from './SelectRangeSheet';
import {
  WEEKDAY_LABELS,
  BUSINESS_STATUS_OPTIONS,
  STAFF_PAINT_OPTIONS,
  formatWindowDate,
  sameMonth,
  clampMonthAnchor,
  mapCalendarStatusToDraft,
  rangesAreValid,
  statusTileLabel,
  staffInitials,
  staffPhoto
} from './availabilityEditorUtils';

export { BUSINESS_AVAILABILITY_ID };
export { StaffAvailabilitySwitcher } from './StaffAvailabilitySwitcher';

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
  const [activeEdit, setActiveEdit] = useState(false);
  const [saveNotice, setSaveNotice] = useState(null);
  const saveNoticeTimerRef = useRef(null);

  const exitActiveEdit = () => {
    setSelectRangeOpen(false);
    setActiveEdit(false);
  };

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

  useEffect(() => {
    if (!activeEdit) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        if (selectRangeOpen) setSelectRangeOpen(false);
        else exitActiveEdit();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeEdit, selectRangeOpen]);

  useEffect(() => {
    setActiveEdit(false);
    setSelectRangeOpen(false);
  }, [staffId]);

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

  const canUseActiveEdit = Boolean(
    (isBusinessFocus && canEditRules) || (!isBusinessFocus && (canEditSelected || canEditRules))
  );

  const enterActiveEdit = () => {
    if (!canUseActiveEdit) return;
    setActiveEdit(true);
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

  const statusLabelForDraft = (status) => {
    if (isBusinessFocus) {
      return status === 'business-closed' ? 'Closed' : 'Available';
    }
    if (status === 'leave') return 'Leave';
    if (status === 'off') return 'Off day';
    if (status === 'business-closed') return 'Business closed';
    return 'Working';
  };

  const applyStatusFromSheet = (
    { status, startDate, endDate, startTime, endTime },
    { quiet = false } = {}
  ) => {
    const rangeLabel =
      startDate === endDate
        ? formatDisplayDate(startDate)
        : `${formatDisplayDate(startDate)} – ${formatDisplayDate(endDate)}`;
    const statusName = statusLabelForDraft(status);

    if (isBusinessFocus) {
      if (!canEditRules) return;
      if (status === 'business-closed') {
        onUpdateRules?.(applyBusinessClosedToRange(availabilityRules, startDate, endDate, true));
      } else {
        onUpdateRules?.(applyBusinessClosedToRange(availabilityRules, startDate, endDate, false));
      }
      setSelectedDay(startDate);
      setSelectRangeOpen(false);
      if (!quiet) showSaveNotice('Range saved', `${statusName} · ${rangeLabel}`);
      return;
    }
    if (!canEditSelected && status !== 'business-closed') return;
    if (status === 'business-closed') {
      if (!canEditRules) return;
      onUpdateRules?.(applyBusinessClosedToRange(availabilityRules, startDate, endDate, true));
      setSelectRangeOpen(false);
      if (!quiet) showSaveNotice('Range saved', `${statusName} · ${rangeLabel}`);
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
    if (!quiet) showSaveNotice('Range saved', `${statusName} · ${rangeLabel}`);
  };

  const paintBrushOptions = useMemo(() => {
    if (isBusinessFocus) return BUSINESS_STATUS_OPTIONS;
    return STAFF_PAINT_OPTIONS;
  }, [isBusinessFocus]);

  const nextCycledStatus = (current) => {
    const options = paintBrushOptions;
    if (!options.length) return 'open';
    const idx = options.findIndex((option) => option.id === current);
    return options[(idx + 1) % options.length].id;
  };

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

  const handleActiveEditDayTap = (key) => {
    if (!activeEdit) return;
    if (!isDateWithinAdvanceWindow(key, availabilityRules, { todayKey })) return;
    const current = resolveDayStatusForPaint(key);
    if (!isBusinessFocus && (current === 'business-closed' || current === 'break')) return;
    const next = nextCycledStatus(current === 'break' ? 'open' : current);
    applyStatusFromSheet(
      {
        status: next,
        startDate: key,
        endDate: key,
        startTime: openTime,
        endTime: closeTime
      },
      { quiet: true }
    );
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

  const commitDayStatus = (nextStatus) => {
    if (isBusinessFocus) {
      if (!canEditRules) return;
      if (nextStatus !== 'open' && nextStatus !== 'business-closed') return;
      setDayDraftStatus(nextStatus);
      setDraftShifts([]);
      setDraftBreaks([]);
      saveDay({ status: nextStatus, shifts: [], breaks: [] });
      return;
    }
    if (!canEditSelected) return;
    if (dayLockedByBusinessClose) return;

    let nextShifts = [];
    let nextBreaks = [];
    if (nextStatus === 'open') {
      const explicit = entry?.days?.[selectedDay];
      if (explicit?.status === 'open' && explicit.ranges?.length) {
        nextShifts = explicit.ranges.map((range) => ({ ...range }));
        nextBreaks = Array.isArray(explicit.breaks)
          ? explicit.breaks.map((range) => ({ ...range }))
          : [];
      } else {
        nextShifts = [{ start: openTime, end: closeTime }];
      }
    }
    setDayDraftStatus(nextStatus);
    setDraftShifts(nextShifts);
    setDraftBreaks(nextBreaks);
    saveDay({ status: nextStatus, shifts: nextShifts, breaks: nextBreaks });
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
                        enterActiveEdit();
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
              <p className="bb-schedule-avail-paint-bar-title">Tap a day to change its colour</p>
              <p className="bb-schedule-avail-paint-bar-hint">
                {isBusinessFocus
                  ? 'Each tap switches Available or Closed. Need many days? Use Select range.'
                  : 'Each tap cycles Working → Off day → Leave. Need many days? Use Select range.'}
              </p>
            </div>
            <button
              type="button"
              className="bb-schedule-avail-select-range-btn is-bar"
              onClick={() => setSelectRangeOpen(true)}
            >
              <CalendarRange size={16} strokeWidth={2.2} aria-hidden="true" />
              Select range
            </button>
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

        <div className={`bb-schedule-picker-grid${activeEdit ? ' is-painting' : ''}`}>
          {monthDays.map((date) => {
            const key = toDateKey(date);
            const inMonth = date.getMonth() === monthAnchor.getMonth();
            const inWindow = isDateWithinAdvanceWindow(key, availabilityRules, { todayKey });
            const status = isBusinessFocus
              ? isBusinessOpenOnDate(key, availabilityRules)
                ? 'open'
                : 'business-closed'
              : resolveCalendarDayStatus(staffId, key, { [staffId]: entry }, availabilityRules);
            const displayStatus = status === 'break' ? 'open' : status;
            const isFocusDay = key === selectedDay;
            const paintable = Boolean(activeEdit) && inWindow;
            return (
              <button
                key={key}
                type="button"
                className={`bb-schedule-picker-day is-${displayStatus}${
                  isFocusDay ? ' is-selected' : ''
                }${inMonth ? '' : ' is-outside'}${inWindow ? '' : ' is-outside-window'}${
                  paintable ? ' is-paintable' : ''
                }`}
                aria-label={`${formatDisplayDate(key)}, ${statusTileLabel(
                  displayStatus,
                  isBusinessFocus
                )}`}
                disabled={Boolean(activeEdit) && !inWindow}
                onClick={() => {
                  if (activeEdit) {
                    handleActiveEditDayTap(key);
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
                  ? 'Marks the whole business closed on this date. Change status saves immediately.'
                  : 'Available follows weekly open days and overall business hours. Change status saves immediately.'}
              </p>
              <div className="bb-schedule-avail-day-actions">
                <span className="bb-schedule-avail-hint">Or confirm again below.</span>
                <button
                  type="button"
                  className="bb-primary-btn"
                  disabled={!canSaveDay}
                  onClick={() => saveDay()}
                >
                  Save changes
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
                  ? 'Change status saves immediately. Save again after editing shifts or breaks.'
                  : 'Change status saves immediately.'}
              </span>
              <button
                type="button"
                className="bb-primary-btn"
                disabled={!canSaveDay}
                onClick={() => saveDay()}
              >
                Save changes
              </button>
            </div>
          </>
        )}
      </section>

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

      {dayStatusSheetOpen ? (
        <ChangeDayStatusSheet
          businessOnly={isBusinessFocus}
          currentStatus={dayDraftStatus}
          onClose={() => setDayStatusSheetOpen(false)}
          onApply={(status) => {
            commitDayStatus(status);
            setDayStatusSheetOpen(false);
          }}
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
          }}
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
