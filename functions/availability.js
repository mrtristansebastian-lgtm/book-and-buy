const cleanString = (value, max = 240) => (
  String(value || '').trim().slice(0, max)
);

const safeLockId = (dateKey, time) => (
  `${cleanString(dateKey, 32)}_${cleanString(time, 32)}`
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 120)
);

const normalizeAvailabilityRules = (workspace = {}) => {
  const rules = workspace.availabilityRules || {};
  const staffAssignmentMode = ['auto', 'client', 'later'].includes(rules.staffAssignmentMode)
    ? rules.staffAssignmentMode
    : 'auto';
  const holdMode = ['pending_confirmed', 'pending_only', 'confirmed_only'].includes(rules.holdMode)
    ? rules.holdMode
    : 'pending_confirmed';
  const fallbackDurationMinutes = Number(rules.fallbackDurationMinutes);
  return {
    enabled: rules.enabled !== false,
    staffAssignmentMode,
    holdMode,
    fallbackDurationMinutes: Number.isFinite(fallbackDurationMinutes)
      ? Math.min(480, Math.max(15, Math.round(fallbackDurationMinutes)))
      : 60
  };
};

const timeToMinutes = (value = '') => {
  const match = cleanString(value, 80).match(/(\d{1,2}):(\d{2})/);
  if (!match) return null;
  const hours = Math.min(23, Math.max(0, Number(match[1])));
  const minutes = Math.min(59, Math.max(0, Number(match[2])));
  return (hours * 60) + minutes;
};

const minutesToTime = (minutes = 0) => {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(normalized / 60)).padStart(2, '0')}:${String(normalized % 60).padStart(2, '0')}`;
};

const parseSlotWindow = (slot = '') => {
  const raw = cleanString(slot, 80);
  const rangeMatch = raw.match(/^(.+?)\s*(?:-|\bto\b)\s*(.+)$/i);
  const start = timeToMinutes(rangeMatch ? rangeMatch[1] : raw);
  if (start === null) return null;
  const end = rangeMatch ? timeToMinutes(rangeMatch[2]) : null;
  return {
    label: raw,
    start,
    end: end !== null && end > start ? end : null
  };
};

const parseDurationMinutes = (value, fallbackMinutes = 60) => {
  const text = cleanString(value, 80).toLowerCase();
  const hourMatch = text.match(/(\d+(?:\.\d+)?)\s*(h|hr|hour)/);
  if (hourMatch) return Math.min(480, Math.max(15, Math.round(Number(hourMatch[1]) * 60)));
  const minuteMatch = text.match(/(\d+(?:\.\d+)?)\s*(m|min|minute)?/);
  const parsed = minuteMatch ? Number(minuteMatch[1]) : Number(text);
  return Number.isFinite(parsed) && parsed > 0
    ? Math.min(480, Math.max(15, Math.round(parsed)))
    : fallbackMinutes;
};

const normalizePublicStaffList = (workspace = {}) => {
  const staff = Array.isArray(workspace.publicStaff) ? workspace.publicStaff : [];
  const normalized = staff
    .filter(member => member?.id)
    .map(member => ({
      id: cleanString(member.id, 120),
      name: cleanString(member.name || member.displayName || 'Team member', 120),
      color: cleanString(member.color || '#111827', 40),
      photoURL: cleanString(member.photoURL || '', 500)
    }))
    .filter((member, index, list) => member.id && list.findIndex(item => item.id === member.id) === index);
  return normalized.length ? normalized : [{ id: 'owner', name: 'Owner', color: '#111827', photoURL: '' }];
};

const getCalendarDefaultTimes = (workspace = {}, staffId = 'workspace') => {
  const businessTimes = Array.isArray(workspace.availableTimes) ? workspace.availableTimes : [];
  if (!staffId || staffId === 'workspace') return businessTimes;
  const staffTimes = workspace.staffCalendars?.[staffId]?.availableTimes;
  return Array.isArray(staffTimes) ? staffTimes : businessTimes;
};

const getCalendarDayConfig = (workspace = {}, staffId = 'workspace', dateKey = '') => {
  const schedule = !staffId || staffId === 'workspace'
    ? (workspace.schedule || {})
    : (workspace.staffCalendars?.[staffId]?.schedule || {});
  const savedConfig = schedule?.[dateKey];
  return {
    available: savedConfig?.available ?? true,
    times: Array.isArray(savedConfig?.times) ? savedConfig.times : getCalendarDefaultTimes(workspace, staffId)
  };
};

const sortSlots = (slots = []) => [...new Set(slots.map(slot => cleanString(slot, 80)).filter(Boolean))]
  .sort((left, right) => (timeToMinutes(left) ?? 9999) - (timeToMinutes(right) ?? 9999) || left.localeCompare(right));

const getServiceForAvailability = ({ workspace = {}, incoming = {} }) => {
  const serviceId = cleanString(incoming.serviceId, 120);
  const services = Array.isArray(workspace.services) ? workspace.services : [];
  const service = services.find(item => cleanString(item.id, 120) === serviceId) || {};
  return {
    ...service,
    id: serviceId || cleanString(service.id, 120),
    duration: incoming.serviceDuration || service.duration || '',
    staffIds: Array.isArray(service.staffIds) ? service.staffIds.map(id => cleanString(id, 120)).filter(Boolean) : []
  };
};

const bookingBlocksAvailability = (booking = {}, holdMode = 'pending_confirmed') => {
  if (booking.time === 'Waitlist') return false;
  if (['waitlist', 'declined', 'completed', 'no-show', 'cancelled', 'canceled'].includes(booking.status)) return false;
  if (holdMode === 'pending_only') return booking.status === 'pending';
  if (holdMode === 'confirmed_only') return booking.status === 'confirmed';
  return ['pending', 'confirmed'].includes(booking.status);
};

const bookingStaffMatches = (booking = {}, staffId = '') => {
  const assignedStaffId = cleanString(booking.staffId || booking.availabilityReservedStaffId, 120);
  return !assignedStaffId || assignedStaffId === staffId;
};

const intervalsOverlap = (leftStart, leftEnd, rightStart, rightEnd) => (
  leftStart < rightEnd && rightStart < leftEnd
);

const getLockBucketIds = ({ dateKey, staffId, startMinutes, durationMinutes }) => {
  const ids = [];
  const endMinutes = startMinutes + Math.max(15, durationMinutes);
  for (let minute = startMinutes; minute < endMinutes; minute += 15) {
    ids.push(safeLockId(dateKey, `${staffId}_${minutesToTime(minute)}`));
  }
  return ids;
};

const getServiceAvailabilityModel = ({
  bookings = [],
  dateKey,
  incoming = {},
  requestedStaffId = '',
  requestedTime = '',
  workspace = {}
}) => {
  const rules = normalizeAvailabilityRules(workspace);
  const businessConfig = getCalendarDayConfig(workspace, 'workspace', dateKey);
  if (!rules.enabled) {
    return {
      rules,
      durationMinutes: parseDurationMinutes(incoming.serviceDuration, rules.fallbackDurationMinutes),
      staffOptions: [],
      timeOptions: sortSlots(businessConfig.available ? businessConfig.times : []),
      selectedOption: requestedTime ? { time: requestedTime, staff: null } : null,
      unavailableReason: businessConfig.available ? '' : 'Closed day'
    };
  }
  if (!dateKey || !businessConfig.available) {
    return { rules, durationMinutes: rules.fallbackDurationMinutes, staffOptions: [], timeOptions: [], selectedOption: null, unavailableReason: 'Closed day' };
  }

  const service = getServiceForAvailability({ workspace, incoming });
  const durationMinutes = parseDurationMinutes(service.duration, rules.fallbackDurationMinutes);
  const allStaff = normalizePublicStaffList(workspace);
  const serviceStaffIds = new Set(service.staffIds || []);
  const eligibleStaff = allStaff.filter(staff => !serviceStaffIds.size || serviceStaffIds.has(staff.id));
  const visibleStaff = requestedStaffId
    ? eligibleStaff.filter(staff => staff.id === requestedStaffId)
    : eligibleStaff;
  const candidateSlots = sortSlots(businessConfig.times || []);
  const timeAssignments = new Map();

  for (const slot of candidateSlots) {
    const slotWindow = parseSlotWindow(slot);
    if (!slotWindow) continue;
    const slotEnd = slotWindow.start + durationMinutes;
    if (slotWindow.end !== null && slotEnd > slotWindow.end) continue;

    for (const staff of visibleStaff) {
      const staffConfig = getCalendarDayConfig(workspace, staff.id, dateKey);
      if (!staffConfig.available) continue;
      const staffCanStart = (staffConfig.times || []).some(staffSlot => {
        const staffWindow = parseSlotWindow(staffSlot);
        if (!staffWindow) return false;
        if (staffWindow.end !== null) return slotWindow.start >= staffWindow.start && slotEnd <= staffWindow.end;
        return staffWindow.start === slotWindow.start;
      });
      if (!staffCanStart) continue;

      const hasOverlap = bookings.some(booking => {
        if (!bookingBlocksAvailability(booking, rules.holdMode) || !bookingStaffMatches(booking, staff.id)) return false;
        const bookingStart = timeToMinutes(booking.time);
        if (bookingStart === null) return false;
        const bookingDuration = parseDurationMinutes(booking.serviceDurationMinutes || booking.serviceDuration || '', rules.fallbackDurationMinutes);
        return intervalsOverlap(slotWindow.start, slotEnd, bookingStart, bookingStart + bookingDuration);
      });
      if (!hasOverlap) {
        timeAssignments.set(slot, [...(timeAssignments.get(slot) || []), staff]);
      }
    }
  }

  const timeOptions = Array.from(timeAssignments.keys());
  const selectedOption = requestedTime && timeAssignments.has(requestedTime)
    ? { time: requestedTime, staff: timeAssignments.get(requestedTime)[0] || null }
    : null;

  return {
    rules,
    durationMinutes,
    staffOptions: eligibleStaff,
    timeOptions,
    selectedOption,
    unavailableReason: timeOptions.length ? '' : 'No matching staff availability'
  };
};

module.exports = {
  bookingBlocksAvailability,
  getLockBucketIds,
  getServiceAvailabilityModel,
  normalizeAvailabilityRules,
  parseDurationMinutes,
  timeToMinutes
};
