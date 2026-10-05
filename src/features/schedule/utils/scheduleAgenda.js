import { getServiceScheduleType } from '../../../utils/scheduleTypes.js';

const DAY = 86400000;
const ACTIVE = new Set(['confirmed', 'pending', 'waitlist']);
const FILTERS = ['active', 'confirmed', 'pending', 'waitlist', 'reschedule'];
const text = value => String(value ?? '').trim();
const dateStamp = key => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const stamp = Date.parse(`${key}T12:00:00Z`);
  return Number.isFinite(stamp) && new Date(stamp).toISOString().slice(0, 10) === key ? stamp : null;
};
const dateFromStamp = stamp => new Date(stamp).toISOString().slice(0, 10);
const validTime = value => /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
const timestamp = value => {
  if (typeof value?.toMillis === 'function') return timestamp(value.toMillis());
  if (value instanceof Date) return Number.isFinite(value.getTime()) ? value.getTime() : null;
  if (value && Number.isFinite(value.seconds)) return value.seconds * 1000 + (value.nanoseconds || 0) / 1000000;
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T/.test(value)) { const at = Date.parse(value); return Number.isFinite(at) ? at : null; }
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
};
const positiveMinutes = value => {
  if (typeof value === 'string' && !/^\d+(?:\.\d+)?(?:\s*(?:min|mins|minutes?))?$/i.test(value.trim())) return null;
  const number = typeof value === 'string' ? Number(value.replace(/\s*(?:min|mins|minutes?)$/i, '')) : value;
  return typeof number === 'number' && Number.isFinite(number) && number > 0 ? number : null;
};

function clockFor(timezone, now) {
  let zone = text(timezone) || 'UTC';
  const create = timeZone => new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' });
  let format;
  try { format = create(zone); } catch { zone = 'UTC'; format = create(zone); }
  const clockAt = at => {
    const parts = Object.fromEntries(format.formatToParts(new Date(at)).map(part => [part.type, part.value]));
    return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}`, seconds: Number(parts.second), timeWithSeconds: `${parts.hour}:${parts.minute}:${parts.second}` };
  };
  return { clock: { ...clockAt(now), timezone: zone }, clockAt };
}

export function getScheduleBusinessClock(timezone = 'UTC', now = Date.now()) {
  return clockFor(timezone, Number.isFinite(now) ? now : Date.now()).clock;
}

function rangeFor(anchorDay, period, customRange) {
  const at = dateStamp(anchorDay);
  if (period === 'all') return { start: '0001-01-01', end: '9999-12-31' };
  if (period === 'custom') {
    const start = dateStamp(customRange.from) !== null ? customRange.from : anchorDay;
    const end = dateStamp(customRange.to) !== null ? customRange.to : start;
    return start <= end ? { start, end } : { start: end, end: start };
  }
  const date = new Date(at);
  if (period === 'week') {
    const monday = at - ((date.getUTCDay() + 6) % 7) * DAY;
    return { start: dateFromStamp(monday), end: dateFromStamp(monday + 6 * DAY) };
  }
  if (period === 'month') return {
    start: dateFromStamp(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), 1, 12)),
    end: dateFromStamp(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0, 12))
  };
  return { start: anchorDay, end: anchorDay };
}

function dedupeBookings(bookings) {
  const map = new Map();
  bookings.filter(Boolean).forEach((booking, index) => {
    const id = text(booking.id) || `unidentified:${index}`;
    const previous = map.get(id);
    const revision = Number(booking.revision) || 0;
    const previousRevision = Number(previous?.revision) || 0;
    const nextUpdated = timestamp(booking.serverUpdatedAt) ?? timestamp(booking.updatedAt) ?? timestamp(booking.createdAt) ?? timestamp(booking.timestamp) ?? -Infinity;
    const previousUpdated = timestamp(previous?.serverUpdatedAt) ?? timestamp(previous?.updatedAt) ?? timestamp(previous?.createdAt) ?? timestamp(previous?.timestamp) ?? -Infinity;
    if (!previous || revision > previousRevision || revision === previousRevision && nextUpdated >= previousUpdated) map.set(id, booking);
  });
  return [...map.values()];
}

const inRange = (key, range) => key && key >= range.start && key <= range.end;
const sortRows = (left, right) => left.dateKey.localeCompare(right.dateKey) || left.time.localeCompare(right.time) ||
  left.clientName.localeCompare(right.clientName, undefined, { sensitivity: 'base' }) || text(left.booking.id).localeCompare(text(right.booking.id));

/** Calendar dates and times belong to the business timezone, not the device timezone. */
export function buildScheduleAgenda({
  bookings = [], services = [], staff = [], staffId = '', timezone = 'UTC', now = Date.now(),
  anchorDay, period = 'day', customRange = {}, filter = 'confirmed', pendingIds = new Set()
} = {}) {
  const safeNow = Number.isFinite(now) ? now : Date.now();
  const { clock, clockAt } = clockFor(timezone, safeNow);
  const todayKey = clock.dateKey;
  const selectedDay = dateStamp(anchorDay) !== null ? anchorDay : todayKey;
  const range = rangeFor(selectedDay, period, customRange);
  const week = rangeFor(todayKey, 'week', {});
  const month = rangeFor(todayKey, 'month', {});
  const servicesById = new Map(services.map(service => [text(service.id), service]));
  const staffById = new Map(staff.map(member => [text(member.id), member]));
  const wallCache = new Map();
  const wallInstants = (dateKey, time) => {
    const key = `${dateKey} ${time}`;
    if (wallCache.has(key)) return wallCache.get(key);
    const nominal = Date.parse(`${dateKey}T${time}:00Z`);
    // Preserve every valid instant: a fall-back hour can occur twice. An offset
    // was not saved on old bookings, so choosing one would invent certainty.
    const candidates = new Set();
    for (const delta of [-DAY, 0, DAY]) {
      const instant = nominal + delta;
      const local = clockAt(instant);
      const offset = Date.parse(`${local.dateKey}T${local.timeWithSeconds}Z`) - instant;
      const at = nominal - offset;
      const candidate = clockAt(at);
      if (candidate.dateKey === dateKey && candidate.time === time) candidates.add(at);
    }
    const instants = [...candidates].sort((a, b) => a - b);
    wallCache.set(key, instants);
    return instants;
  };
  const all = dedupeBookings(bookings).filter(booking => ACTIVE.has(text(booking.status))).map(booking => {
    const service = servicesById.get(text(booking.serviceId)) || null;
    const assignedStaffId = text(booking.staffId);
    const member = staffById.get(assignedStaffId);
    const kind = getServiceScheduleType({ scheduleType: booking.scheduleType || booking.serviceScheduleType || service?.scheduleType, bookingType: booking.bookingType || service?.bookingType });
    const dateKey = text(booking.dateKey || booking.date);
    const time = text(booking.time);
    const dateValid = dateStamp(dateKey) !== null;
    const instants = dateValid && validTime(time) ? wallInstants(dateKey, time) : [];
    const startValid = instants.length > 0;
    const startAmbiguous = instants.length > 1;
    const startAt = instants.length === 1 ? instants[0] : null;
    const startWall = startValid ? Date.parse(`${dateKey}T${time}:00Z`) : null;
    let durationMinutes = positiveMinutes(booking.durationMinutes) ?? positiveMinutes(booking.serviceDuration);
    let endAt = startAt !== null && durationMinutes !== null ? startAt + durationMinutes * 60000 : null;
    const snapshotEndDate = text(booking.sessionEndDate || booking.endDateKey);
    const snapshotEndTime = text(booking.sessionEndTime || booking.endTime);
    if (kind === 'class_session' && dateStamp(snapshotEndDate) !== null && validTime(snapshotEndTime)) {
      const endInstants = wallInstants(snapshotEndDate, snapshotEndTime);
      if (startAt !== null && endInstants.length === 1 && endInstants[0] > startAt) {
        endAt = endInstants[0];
        durationMinutes = (endAt - startAt) / 60000;
      }
    }
    const endValid = endAt !== null && Number.isFinite(endAt) && Number.isFinite(new Date(endAt).getTime()) && endAt > startAt;
    const endClock = endValid ? clockAt(endAt) : null;
    const endWall = endClock ? Date.parse(`${endClock.dateKey}T${endClock.timeWithSeconds}Z`) : null;
    const candidateEnds = endValid ? [endAt] : durationMinutes !== null ? instants.map(at => at + durationMinutes * 60000) : [];
    const phase = !startValid ? 'unknown' : instants.every(at => at > safeNow) ? 'upcoming'
      : candidateEnds.length && candidateEnds.every(at => at <= safeNow) ? 'past'
      : candidateEnds.length && instants.every(at => at <= safeNow) && candidateEnds.every(at => at > safeNow) ? 'in-progress' : 'unknown';
    return {
      booking, service, kind, phase, assignedStaffId, dateKey, time, dateValid, startValid, startAmbiguous, endValid,
      startAt, endAt: endValid ? endAt : null, startWall, endWall, durationMinutes, endDateKey: endClock?.dateKey || '', endTime: endClock?.time || '',
      clientName: text(booking.clientName) || 'Client', serviceName: text(booking.serviceName) || text(service?.name) || 'Booking',
      staffName: text(booking.staffName) || text(member?.name) || (assignedStaffId ? 'Former staff member' : 'Unassigned'),
      staff: { ...(member || {}), id: assignedStaffId, name: text(booking.staffName) || text(member?.name) || (assignedStaffId ? 'Former staff member' : 'Unassigned'), photoURL: booking.staffPhotoURL || member?.photoURL || member?.imageUrl || '', former: Boolean(assignedStaffId && !member), unassigned: !assignedStaffId },
      rescheduleRequested: pendingIds.has(booking.id),
      attentionReason: !dateValid ? 'Booking date needs attention' : !startValid ? 'Booking time needs attention' : startAmbiguous ? 'This time happens twice when the clocks change. Check the booking time.' : !endValid ? 'End time not recorded' : ''
    };
  });
  const staffMatches = row => !staffId || staffId === '__unassigned__' && row.staff.unassigned || staffId === '__former__' && row.staff.former || row.assignedStaffId === text(staffId);
  const rows = all.filter(staffMatches).sort(sortRows);
  const confirmed = rows.filter(row => row.booking.status === 'confirmed');
  const upcoming = confirmed.filter(row => row.phase === 'upcoming');
  const summary = {
    today: upcoming.filter(row => row.dateKey === todayKey).length,
    week: upcoming.filter(row => inRange(row.dateKey, week)).length,
    month: upcoming.filter(row => inRange(row.dateKey, month)).length,
    inProgress: confirmed.filter(row => row.phase === 'in-progress').length
  };
  const rangeStart = Date.parse(`${range.start}T00:00:00Z`);
  const rangeEnd = Date.parse(`${range.end}T00:00:00Z`) + DAY;
  const overlapsSelected = row => row.startValid && row.endValid && row.startWall < rangeEnd && row.endWall > rangeStart;
  const withinSelected = rows.filter(row => !row.dateValid || inRange(row.dateKey, range) || overlapsSelected(row))
    .map(row => ({ ...row, carryover: row.dateValid && row.dateKey < range.start && overlapsSelected(row) }));
  const matchesFilter = (row, value) => value === 'active' || (value === 'reschedule' ? row.rescheduleRequested : row.booking.status === value);
  const filterCounts = Object.fromEntries(FILTERS.map(value => [value, withinSelected.filter(row => matchesFilter(row, value)).length]));
  const selectedFilter = FILTERS.includes(filter) ? filter : 'confirmed';
  const filtered = withinSelected.filter(row => matchesFilter(row, selectedFilter));
  const needsAttention = filtered.filter(row => !row.startValid);
  const visible = filtered.filter(row => row.startValid);
  const grouped = new Map();
  visible.forEach(row => {
    if (!grouped.has(row.dateKey)) grouped.set(row.dateKey, { dateKey: row.dateKey, carryover: row.carryover, items: [] });
    grouped.get(row.dateKey).items.push(row);
  });
  const staffFilterOptions = [{ id: '', name: 'All staff' }, ...staff.map(member => ({ ...member, id: text(member.id), name: text(member.name) || 'Staff member' }))];
  if (all.some(row => row.staff.unassigned)) staffFilterOptions.push({ id: '__unassigned__', name: 'Unassigned' });
  if (all.some(row => row.staff.former)) staffFilterOptions.push({ id: '__former__', name: 'Former staff' });
  return {
    clock, todayKey, currentTime: clock.time, range, summary, groups: [...grouped.values()], needsAttention,
    nextBooking: upcoming[0] || null, filteredCount: filtered.length, filterCounts, countsByStatus: filterCounts,
    rows, filteredRows: filtered, staffFilterOptions, filter: selectedFilter
  };
}
