import {
  addMinutesToTime,
  getBookingDateKey as resolveRawBookingDateKey,
  getSlotStartMinutes,
  getStaffDisplayName,
  getStaffUsername,
  inferSlotInterval,
  minutesToTimeValue,
  sortSlotValues,
  timeValueToMinutes
} from './businessCalendarUtils';

export const fallbackTimes = ['09:00', '10:30', '12:00', '14:30', '16:00', '17:30'];

export const getStatusMeta = (booking = {}) => {
  if (booking.status === 'confirmed') return { label: 'Confirmed', tone: 'confirmed' };
  if (booking.status === 'waitlist' || booking.time === 'Waitlist') return { label: 'Waitlist', tone: 'waitlist' };
  if (booking.status === 'pending') return { label: 'Pending', tone: 'pending' };
  return { label: booking.status || 'Request', tone: 'neutral' };
};

export const buildStaffMembers = ({ activeStaffId, staffList, workspaceRole }) => {
  const activeStaff = (staffList || []).filter(staff => staff?.id && staff.accessEnabled !== false);
  const fallbackStaff = [{
    id: activeStaffId || 'owner',
    name: workspaceRole === 'staff' ? 'My Calendar' : 'Owner',
    role: workspaceRole === 'staff' ? 'staff' : 'owner',
    color: '#111827'
  }];
  return (activeStaff.length ? activeStaff : fallbackStaff)
    .filter((staff, index, list) => staff?.id && list.findIndex(item => item.id === staff.id) === index);
};

export const buildCalendars = (staffMembers) => [
  {
    id: 'workspace',
    name: 'Business Overview',
    shortName: 'Business',
    role: `${staffMembers.length} ${staffMembers.length === 1 ? 'profile' : 'profiles'}`,
    color: '#111827'
  },
  ...staffMembers.map(staff => ({
    id: staff.id,
    name: getStaffDisplayName(staff),
    shortName: String(getStaffDisplayName(staff)).trim().split(/\s+/)[0] || 'Team',
    role: staff.role === 'owner' ? 'Owner' : staff.role === 'admin' ? 'Admin' : 'Staff',
    username: getStaffUsername(staff),
    color: staff.color || '#2563eb',
    photoURL: staff.photoURL || ''
  }))
].filter((calendar, index, list) => calendar.id && list.findIndex(item => item.id === calendar.id) === index);

export const getCalendarDefaultTimes = (settings, calendarId) => {
  const businessTimes = Array.isArray(settings.availableTimes) ? settings.availableTimes : [];
  if (calendarId === 'workspace') return businessTimes;
  const staffTimes = settings.staffCalendars?.[calendarId]?.availableTimes;
  return Array.isArray(staffTimes) ? staffTimes : businessTimes;
};

export const getCalendarDayConfig = (settings, calendarId, dateStr) => {
  const schedule = calendarId === 'workspace'
    ? (settings.schedule || {})
    : (settings.staffCalendars?.[calendarId]?.schedule || {});
  const savedConfig = schedule?.[dateStr];
  return {
    available: savedConfig?.available ?? true,
    times: Array.isArray(savedConfig?.times) ? savedConfig.times : [...getCalendarDefaultTimes(settings, calendarId)]
  };
};

export const buildDefaultSlotSettings = (settings, calendarId) => {
  const defaults = calendarId !== 'workspace'
    ? (settings.staffCalendars?.[calendarId]?.scheduleDefaults || settings.scheduleDefaults || {})
    : (settings.scheduleDefaults || {});
  const defaultTimes = getCalendarDefaultTimes(settings, calendarId).length
    ? getCalendarDefaultTimes(settings, calendarId)
    : fallbackTimes;
  const interval = Number(defaults.interval || inferSlotInterval(defaultTimes));
  const duration = Number(defaults.duration || Math.min(interval || 60, 90));
  return {
    start: defaults.start || defaultTimes[0] || '09:00',
    end: defaults.end || addMinutesToTime(defaultTimes[defaultTimes.length - 1] || '16:00', duration),
    interval,
    duration,
    mode: defaults.mode || 'single',
    capacity: Number(defaults.capacity || 1),
    defaultTimes
  };
};

export const buildDefaultSlots = (defaultSlotSettings) => {
  const startMinutes = timeValueToMinutes(defaultSlotSettings.start, '09:00');
  const endMinutes = timeValueToMinutes(defaultSlotSettings.end, '17:00');
  const stepMinutes = Math.max(15, Number(defaultSlotSettings.interval) || 90);
  const durationMinutes = Math.max(15, Number(defaultSlotSettings.duration) || stepMinutes);
  if (endMinutes <= startMinutes) return defaultSlotSettings.defaultTimes || fallbackTimes;
  const generatedTimes = [];
  for (let minutes = startMinutes; minutes < endMinutes; minutes += stepMinutes) {
    const startValue = minutesToTimeValue(minutes);
    if (defaultSlotSettings.mode === 'range') {
      const endValue = minutesToTimeValue(Math.min(minutes + durationMinutes, endMinutes));
      if (endValue !== startValue) generatedTimes.push(`${startValue} - ${endValue}`);
    } else {
      generatedTimes.push(startValue);
    }
  }
  return sortSlotValues(generatedTimes);
};

export const resolveBookingDateKey = (booking, todayStr, currentMonth) => (
  resolveRawBookingDateKey(booking, { todayStr, currentMonth })
);

export const getStaffCoverageForDate = ({ dateStr, settings, staffMembers }) => {
  const businessConfig = getCalendarDayConfig(settings, 'workspace', dateStr);
  if (!businessConfig.available) return [];
  const businessTimes = new Set(businessConfig.times || []);
  return staffMembers.filter(staff => {
    const staffConfig = getCalendarDayConfig(settings, staff.id, dateStr);
    return staffConfig.available && (staffConfig.times || []).some(time => !businessTimes.size || businessTimes.has(time));
  });
};

export const getSelectedBookings = ({ agendaCalendarId, bookings, currentMonth, selectedDate, todayStr }) => (
  (bookings || [])
    .map(booking => ({ ...booking, dateKeyResolved: resolveBookingDateKey(booking, todayStr, currentMonth) }))
    .filter(booking => (
      booking.dateKeyResolved === selectedDate &&
      booking.status !== 'declined' &&
      (agendaCalendarId === 'workspace' || booking.staffId === agendaCalendarId)
    ))
    .sort((a, b) => getSlotStartMinutes(a.time) - getSlotStartMinutes(b.time) || String(a.clientName || '').localeCompare(String(b.clientName || '')))
);

export const groupBookingsByTime = (bookings) => bookings.reduce((groups, booking) => {
  const timeKey = booking.time || 'Unscheduled';
  groups[timeKey] = [...(groups[timeKey] || []), booking];
  return groups;
}, {});

export const getServiceRows = (bookings) => Object.entries(bookings.reduce((summary, booking) => {
  const serviceName = booking.serviceName || 'Unassigned service';
  summary[serviceName] = (summary[serviceName] || 0) + 1;
  return summary;
}, {})).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
