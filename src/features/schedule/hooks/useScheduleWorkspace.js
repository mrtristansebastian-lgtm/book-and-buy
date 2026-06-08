import { useEffect, useMemo, useState } from 'react';
import { getLocalDateStr } from '../../../utils/dates';
import {
  addDaysToDate,
  dateFromKey,
  formatSlotEditorValue,
  getDateRange,
  getNextOpenTime,
  getStaffInitials,
  parseSlotValue,
  sortSlotValues,
  timeValueToMinutes
} from '../utils/businessCalendarUtils';
import {
  buildCalendars,
  buildDefaultSlots,
  buildDefaultSlotSettings,
  buildStaffMembers,
  getCalendarDayConfig,
  getSelectedBookings,
  groupBookingsByTime,
} from '../utils/scheduleWorkspaceModel';

export const useScheduleWorkspace = ({
  activeStaffId = 'owner',
  bookings = [],
  onSettingsDirty,
  setSettings,
  settings,
  showToast,
  staffList = [],
  workspaceRole = 'owner'
}) => {
  const todayStr = getLocalDateStr(new Date());
  const initialCalendarId = workspaceRole === 'staff' ? (activeStaffId || 'owner') : 'workspace';
  const [selectedDate, setSelectedDate] = useState(todayStr);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedCalendarId, setSelectedCalendarId] = useState(initialCalendarId);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [slotEditor, setSlotEditor] = useState(null);

  const staffMembers = useMemo(() => buildStaffMembers({ activeStaffId, staffList, workspaceRole }), [activeStaffId, staffList, workspaceRole]);
  const calendars = useMemo(() => buildCalendars(staffMembers), [staffMembers]);
  const selectedCalendar = calendars.find(calendar => calendar.id === selectedCalendarId) || calendars[0];
  const isWorkspaceCalendar = selectedCalendarId === 'workspace';
  const canEditSelectedCalendar = workspaceRole !== 'staff' || selectedCalendarId === activeStaffId;
  const availabilityRules = {
    enabled: settings.availabilityRules?.enabled !== false,
    staffAssignmentMode: ['auto', 'client', 'later'].includes(settings.availabilityRules?.staffAssignmentMode)
      ? settings.availabilityRules.staffAssignmentMode
      : 'auto',
    holdMode: ['pending_confirmed', 'pending_only', 'confirmed_only'].includes(settings.availabilityRules?.holdMode)
      ? settings.availabilityRules.holdMode
      : 'pending_confirmed',
    fallbackDurationMinutes: Number(settings.availabilityRules?.fallbackDurationMinutes) || 60
  };

  useEffect(() => {
    if (workspaceRole === 'staff' && activeStaffId) setSelectedCalendarId(activeStaffId);
  }, [activeStaffId, workspaceRole]);

  useEffect(() => {
    if (!calendars.some(calendar => calendar.id === selectedCalendarId)) {
      setSelectedCalendarId(workspaceRole === 'staff' ? (activeStaffId || 'workspace') : 'workspace');
    }
  }, [activeStaffId, calendars, selectedCalendarId, workspaceRole]);

  const guardCalendarEdit = (calendarId = selectedCalendarId) => {
    const canEdit = workspaceRole !== 'staff' || calendarId === activeStaffId;
    if (!canEdit) {
      showToast?.(calendarId === 'workspace'
        ? 'Business overview is view only for staff. Switch to your own calendar to edit availability.'
        : 'You can view teammate calendars, but only edit your own availability.');
      return false;
    }
    return true;
  };

  const updateDateConfigForCalendar = (calendarId, dateStr, nextConfig) => {
    if (!guardCalendarEdit(calendarId)) return false;
    onSettingsDirty?.();
    setSettings(prev => {
      if (calendarId === 'workspace') return { ...prev, schedule: { ...(prev.schedule || {}), [dateStr]: nextConfig } };
      const previousCalendar = prev.staffCalendars?.[calendarId] || {};
      return {
        ...prev,
        staffCalendars: {
          ...(prev.staffCalendars || {}),
          [calendarId]: {
            ...previousCalendar,
            staffId: calendarId,
            schedule: { ...(previousCalendar.schedule || {}), [dateStr]: nextConfig },
            updatedAt: Date.now()
          }
        }
      };
    });
    return true;
  };

  const updateDefaultTimesForCalendar = (calendarId, nextTimes) => {
    if (!guardCalendarEdit(calendarId)) return;
    onSettingsDirty?.();
    const sortedTimes = sortSlotValues(nextTimes);
    setSettings(prev => {
      if (calendarId === 'workspace') return { ...prev, availableTimes: sortedTimes };
      const previousCalendar = prev.staffCalendars?.[calendarId] || {};
      return {
        ...prev,
        staffCalendars: {
          ...(prev.staffCalendars || {}),
          [calendarId]: { ...previousCalendar, staffId: calendarId, availableTimes: sortedTimes, updatedAt: Date.now() }
        }
      };
    });
  };

  const defaultSlotSettings = buildDefaultSlotSettings(settings, selectedCalendarId);
  const generatedSlots = buildDefaultSlots(defaultSlotSettings);
  const defaultSlots = sortSlotValues(defaultSlotSettings.defaultTimes?.length ? defaultSlotSettings.defaultTimes : generatedSlots);
  const agendaCalendarId = selectedCalendarId;
  const dayConfig = getCalendarDayConfig(settings, agendaCalendarId, selectedDate);
  const selectedDateObj = dateFromKey(selectedDate);
  const selectedDayTitle = selectedDateObj.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  const selectedBookings = useMemo(() => getSelectedBookings({
    agendaCalendarId,
    bookings,
    currentMonth,
    selectedDate,
    todayStr
  }), [agendaCalendarId, bookings, currentMonth, selectedDate, todayStr]);

  const bookingsByTime = useMemo(() => groupBookingsByTime(selectedBookings), [selectedBookings]);
  const googleSyncableBookings = useMemo(() => (bookings || []).filter(booking => (
    !booking.isExample &&
    booking.status === 'confirmed' &&
    booking.dateKey &&
    booking.time &&
    booking.time !== 'Waitlist' &&
    !booking.googleCalendarEventId &&
    (selectedCalendarId === 'workspace' || booking.staffId === selectedCalendarId)
  )), [bookings, selectedCalendarId]);

  const reservedSlotCount = selectedBookings.filter(booking => booking.time && booking.time !== 'Waitlist').length;
  const openSlotCount = dayConfig.available ? Math.max(0, (dayConfig.times?.length || 0) - reservedSlotCount) : 0;

  const actions = {
    applyDefaultSlotsToDate: (dateStr = selectedDate, calendarId = selectedCalendarId) => {
      const targetConfig = getCalendarDayConfig(settings, calendarId, dateStr);
      updateDateConfigForCalendar(calendarId, dateStr, { ...targetConfig, available: true, times: defaultSlots });
      showToast?.('Default slots applied.');
    },
    applyDefaultSlotsForScope: (scope = 'day', range = {}) => {
      const anchor = dateFromKey(selectedDate);
      let dates = [selectedDate];

      if (scope === 'month') {
        dates = Array.from({ length: new Date(anchor.getFullYear(), anchor.getMonth() + 1, 0).getDate() }, (_, index) => getLocalDateStr(new Date(anchor.getFullYear(), anchor.getMonth(), index + 1)));
      } else if (scope === 'week') {
        dates = Array.from({ length: 7 }, (_, index) => getLocalDateStr(addDaysToDate(anchor, index - ((anchor.getDay() + 6) % 7))));
      } else if (scope === 'always') {
        dates = Array.from({ length: 365 }, (_, index) => getLocalDateStr(addDaysToDate(anchor, index)));
      } else if (scope === 'custom') {
        const startDate = dateFromKey(range.startDate || selectedDate);
        const endDate = dateFromKey(range.endDate || range.startDate || selectedDate);
        if (endDate < startDate) return showToast?.('Custom period end date must be after the start date.');
        dates = getDateRange(startDate, endDate);
      }

      if (!guardCalendarEdit(selectedCalendarId)) return;
      onSettingsDirty?.();
      setSettings(prev => {
        if (selectedCalendarId === 'workspace') {
          const nextSchedule = { ...(prev.schedule || {}) };
          dates.forEach(dateStr => {
            const targetConfig = getCalendarDayConfig(prev, selectedCalendarId, dateStr);
            nextSchedule[dateStr] = { ...targetConfig, available: true, times: defaultSlots };
          });
          return { ...prev, schedule: nextSchedule };
        }

        const previousCalendar = prev.staffCalendars?.[selectedCalendarId] || {};
        const nextSchedule = { ...(previousCalendar.schedule || {}) };
        dates.forEach(dateStr => {
          const targetConfig = getCalendarDayConfig(prev, selectedCalendarId, dateStr);
          nextSchedule[dateStr] = { ...targetConfig, available: true, times: defaultSlots };
        });
        return {
          ...prev,
          staffCalendars: {
            ...(prev.staffCalendars || {}),
            [selectedCalendarId]: {
              ...previousCalendar,
              staffId: selectedCalendarId,
              schedule: nextSchedule,
              updatedAt: Date.now()
            }
          }
        };
      });
      const scopeLabel = scope === 'day'
        ? 'the selected day'
        : scope === 'always'
          ? 'the next year'
          : scope === 'custom'
            ? 'the custom period'
            : `this ${scope}`;
      showToast?.(`Default slots applied to ${scopeLabel}.`);
    },
    addDefaultSlot: (slot) => {
      const nextSlot = String(slot || '').trim();
      if (!nextSlot) return;
      updateDefaultTimesForCalendar(selectedCalendarId, [...defaultSlots, nextSlot]);
    },
    deleteDefaultSlot: (slot) => updateDefaultTimesForCalendar(selectedCalendarId, defaultSlots.filter(time => time !== slot)),
    updateDefaultSlot: (oldSlot, nextSlot) => {
      const normalizedSlot = String(nextSlot || '').trim();
      if (!normalizedSlot) return;
      updateDefaultTimesForCalendar(selectedCalendarId, defaultSlots.map(time => time === oldSlot ? normalizedSlot : time));
    },
    deleteSlotFromEditor: () => {
      if (slotEditor?.isDefaultSlot) {
        if (!guardCalendarEdit(selectedCalendarId)) return;
        if (slotEditor.originalTime) updateDefaultTimesForCalendar(selectedCalendarId, defaultSlots.filter(time => time !== slotEditor.originalTime));
        return setSlotEditor(null);
      }
      if (!slotEditor?.dateStr || !slotEditor?.calendarId || !guardCalendarEdit(slotEditor.calendarId)) return;
      if (!slotEditor.originalTime) return setSlotEditor(null);
      const targetConfig = getCalendarDayConfig(settings, slotEditor.calendarId, slotEditor.dateStr);
      updateDateConfigForCalendar(slotEditor.calendarId, slotEditor.dateStr, {
        ...targetConfig,
        times: targetConfig.times.filter(time => time !== slotEditor.originalTime)
      });
      setSlotEditor(null);
    },
    moveDateWindow: (direction) => {
      const nextDate = addDaysToDate(dateFromKey(selectedDate), direction);
      setSelectedDate(getLocalDateStr(nextDate));
      setCurrentMonth(new Date(nextDate.getFullYear(), nextDate.getMonth(), 1));
    },
    saveGeneratedDefaultSlots: () => {
      updateDefaultTimesForCalendar(selectedCalendarId, defaultSlots);
      showToast?.('Default slots saved.');
    },
    saveSlotEditor: () => {
      if (slotEditor?.isDefaultSlot) {
        if (!guardCalendarEdit(selectedCalendarId)) return;
        const slotValue = formatSlotEditorValue(slotEditor);
        if (!slotValue) return showToast?.('Add a time before saving this slot.');
        if (slotEditor.mode === 'range' && (!slotEditor.end || timeValueToMinutes(slotEditor.end) <= timeValueToMinutes(slotEditor.start))) {
          return showToast?.('End time must be later than the start time.');
        }
        if (defaultSlots.includes(slotValue) && slotValue !== slotEditor.originalTime) return showToast?.('That default slot already exists.');
        const nextTimes = slotEditor.originalTime
          ? defaultSlots.map(time => time === slotEditor.originalTime ? slotValue : time)
          : [...defaultSlots, slotValue];
        updateDefaultTimesForCalendar(selectedCalendarId, nextTimes);
        return setSlotEditor(null);
      }
      if (!slotEditor?.dateStr || !slotEditor?.calendarId || !guardCalendarEdit(slotEditor.calendarId)) return;
      const slotValue = formatSlotEditorValue(slotEditor);
      if (!slotValue) return showToast?.('Add a time before saving this slot.');
      if (slotEditor.mode === 'range' && (!slotEditor.end || timeValueToMinutes(slotEditor.end) <= timeValueToMinutes(slotEditor.start))) {
        return showToast?.('End time must be later than the start time.');
      }
      const targetConfig = getCalendarDayConfig(settings, slotEditor.calendarId, slotEditor.dateStr);
      if (targetConfig.times.includes(slotValue) && slotValue !== slotEditor.originalTime) return showToast?.('That time already exists for this day.');
      const nextTimes = slotEditor.originalTime
        ? targetConfig.times.map(time => time === slotEditor.originalTime ? slotValue : time)
        : [...targetConfig.times, slotValue];
      updateDateConfigForCalendar(slotEditor.calendarId, slotEditor.dateStr, { ...targetConfig, available: true, times: sortSlotValues(nextTimes) });
      setSlotEditor(null);
    },
    selectCalendar: (calendarId) => {
      setSelectedCalendarId(calendarId);
    },
    selectDate: (dateStr) => {
      setSelectedDate(dateStr);
      const date = dateFromKey(dateStr);
      setCurrentMonth(new Date(date.getFullYear(), date.getMonth(), 1));
    },
    startAddingSlot: () => {
      if (!guardCalendarEdit(agendaCalendarId)) return;
      setSlotEditor({ originalTime: null, dateStr: selectedDate, calendarId: agendaCalendarId, mode: 'single', start: getNextOpenTime(dayConfig.times), end: '' });
    },
    startEditingSlot: (time) => {
      if (!time || !guardCalendarEdit(agendaCalendarId)) return;
      setSlotEditor({ originalTime: time, dateStr: selectedDate, calendarId: agendaCalendarId, ...parseSlotValue(time) });
    },
    startEditingDefaultSlot: (time) => {
      if (!time || !guardCalendarEdit(selectedCalendarId)) return;
      setSlotEditor({
        originalTime: time,
        isDefaultSlot: true,
        calendarId: selectedCalendarId,
        label: 'Default slots',
        ...parseSlotValue(time)
      });
    },
    startAddingDefaultSlot: () => {
      if (!guardCalendarEdit(selectedCalendarId)) return;
      setSlotEditor({
        originalTime: null,
        isDefaultSlot: true,
        calendarId: selectedCalendarId,
        label: 'Default slots',
        mode: 'single',
        start: getNextOpenTime(defaultSlots),
        end: ''
      });
    },
    toggleDateAvailability: () => updateDateConfigForCalendar(agendaCalendarId, selectedDate, { ...dayConfig, available: !dayConfig.available }),
    toggleWaitlist: () => {
      onSettingsDirty?.();
      setSettings(prev => ({ ...prev, features: { ...(prev.features || {}), waitlist: prev.features?.waitlist === false } }));
    },
    updateAvailabilityRules: (patch = {}) => {
      if (!guardCalendarEdit('workspace')) return;
      onSettingsDirty?.();
      setSettings(prev => ({
        ...prev,
        availabilityRules: {
          enabled: prev.availabilityRules?.enabled !== false,
          staffAssignmentMode: 'auto',
          holdMode: 'pending_confirmed',
          fallbackDurationMinutes: 60,
          ...(prev.availabilityRules || {}),
          enabled: true,
          ...patch
        }
      }));
    }
  };

  return {
    actions,
    agendaCalendarId,
    availabilityRules,
    bookingsByTime,
    calendars,
    canEditSelectedCalendar,
    dayConfig,
    defaultSlots,
    generatedSlots,
    getStaffInitials,
    googleSyncableBookings,
    isPastDay: selectedDate < todayStr,
    isToday: selectedDate === todayStr,
    isWorkspaceCalendar,
    openSlotCount,
    selectedBookings,
    selectedCalendar,
    selectedCalendarId,
    selectedDate,
    selectedDayTitle,
    setSettingsModalOpen,
    setSlotEditor,
    settingsModalOpen,
    slotEditor,
    todayStr,
    waitlistEnabled: settings.features?.waitlist !== false,
  };
};
