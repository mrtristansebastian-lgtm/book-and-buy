// Shared, dependency-free booking policy used by the server and local demo.
import { assertBusinessCommerceEnabled } from './businessCapabilities.js';
import { serviceNeedsTimingConversation } from './serviceTiming.js';
import { isFirstComeBooking } from './bookingModes.js';
import { isRetiredEventService } from './serviceTemplates.js';
export function bookingError(message, code = 'failed-precondition') { const error = new Error(message); error.code = code; throw error; }
const minutes = (time) => /^\d{2}:\d{2}$/.test(time || '') ? Number(time.slice(0, 2)) * 60 + Number(time.slice(3)) : NaN;
const overlaps = (a, b, c, d) => a < d && b > c;
export function bookingSlot(booking) { return { dateKey: booking.dateKey || booking.date, time: booking.time, scheduleSessionId: booking.scheduleSessionId || '' }; }
export function sameSlot(a, b) { return a?.dateKey === b?.dateKey && a?.time === b?.time && (a?.scheduleSessionId || '') === (b?.scheduleSessionId || ''); }
export function bookingFingerprint(booking) { return JSON.stringify([booking.revision || 0, booking.serviceId, booking.durationMinutes, booking.staffId || '', booking.partySize || 1, booking.amountInCents, booking.paymentStatus, booking.status]); }
export function businessClock(timezone = 'UTC', now = Date.now()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(new Date(now)).map((p) => [p.type, p.value]));
  return { dateKey: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` };
}
export function validWallTime(dateKey, time, timezone) {
  return Number.isFinite(wallTimeMillis(dateKey,time,timezone));
}
export function wallTimeMillis(dateKey,time,timezone) {
  const target = `${dateKey} ${time}`; const nominal = Date.parse(`${dateKey}T${time}:00Z`);
  if (!Number.isFinite(nominal)) return NaN;
  // Test actual zone offsets surrounding the date; rejects DST gaps, accepts a real overlap.
  const candidates = new Set();
  for (const delta of [-86400000, 0, 86400000]) {
    const instant = nominal + delta; const clock = businessClock(timezone, instant);
    const local = Date.parse(`${clock.dateKey}T${clock.time}:00Z`); candidates.add(nominal - (local - instant));
  }
  return [...candidates].sort((a,b) => a-b).find((instant) => { const clock = businessClock(timezone, instant); return `${clock.dateKey} ${clock.time}` === target; }) ?? NaN;
}
export function bookingNoticeMinutes(value) {
  if (value == null || String(value).trim() === '') return 0;
  if (Number.isFinite(Number(value)) && Number(value) >= 0) return Number(value);
  const match = String(value).trim().match(/^(\d+)\s*(minutes?|hours?|days?|weeks?)$/i);
  if (!match) bookingError('Correct the booking notice setting.');
  return Number(match[1]) * ({minute:1,hour:60,day:1440,week:10080}[match[2].toLowerCase().replace(/s$/,'')] || 1);
}
function workingRanges(workspace, staffId, dateKey) {
  const rules = workspace.availabilityRules || {};
  const weekday = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'][new Date(`${dateKey}T12:00:00Z`).getUTCDay()];
  const row = rules.weekdayHours?.[weekday];
  if (rules.closedDates?.includes(dateKey) || (row ? !row.open : !(rules.openWeekdays || ['mon', 'tue', 'wed', 'thu', 'fri']).includes(weekday))) return [];
  const business = [minutes(row?.openTime || rules.businessOpenTime || '09:00'), minutes(row?.closeTime || rules.businessCloseTime || '17:00')];
  if (business[1] <= business[0]) business[1] += 1440;
  if (!staffId) return [business];
  const entry = workspace.staffAvailability?.[staffId];
  const day = entry?.days?.[dateKey]; const template = entry?.weekTemplate?.[weekday];
  if (day && (['off', 'leave'].includes(day.status) || day.open === false && day.status !== 'break')) return [];
  if (!day && template?.open === false) return [];
  const base = day?.status === 'break' ? template?.ranges : day?.ranges || template?.ranges;
  let ranges = (base || [{ start: row?.openTime || rules.businessOpenTime || '09:00', end: row?.closeTime || rules.businessCloseTime || '17:00' }]).map((r) => { const a = minutes(r.start); let b = minutes(r.end); if (b <= a) b += 1440; return [Math.max(a, business[0]), Math.min(b, business[1])]; }).filter(([a, b]) => b > a);
  const exclusions = [...(day?.status === 'break' ? day.ranges || [] : day?.breaks || [])];
  for (const block of entry?.blocks || []) if (dateKey >= block.startDate && dateKey <= (block.endDate || block.startDate)) {
    if (!block.startTime && !block.endTime) return [];
    exclusions.push({ start: block.startTime || '00:00', end: block.endTime || '23:59' });
  }
  for (const exclusion of exclusions) { const a = minutes(exclusion.start); let b = minutes(exclusion.end); if (b <= a) b += 1440; ranges = ranges.flatMap(([start, end]) => !overlaps(start, end, a, b) ? [[start, end]] : [[start, Math.min(end, a)], [Math.max(start, b), end]].filter(([x, y]) => y > x)); }
  return ranges;
}
export function validateBookingSlot(workspace, booking, slot, bookings = [], now = Date.now()) {
  assertBusinessCommerceEnabled(workspace);
  if (booking.staffId && workspace.staff?.some(member => member.id === booking.staffId && member.active === false)) bookingError('This team member is not available for new bookings.');
  const rules = workspace.availabilityRules || {}; const zone = workspace.timezone || 'UTC';
  const today = businessClock(zone, now); const key = slot?.dateKey; const time = slot?.time;
  const service = (workspace.services || []).find((s) => s.id === booking.serviceId);
  if (!service) bookingError('This service is no longer available.');
  if (isRetiredEventService(service)) bookingError('Event bookings are no longer supported. Choose a Slot or Spot service.');
  if (serviceNeedsTimingConversation(service)) bookingError('Contact the business to arrange the timing before booking.');
  const firstCome = isFirstComeBooking(workspace, service, booking);
  // A queue entry holds no calendar time. Partial dates still fail normal validation.
  if (firstCome && !key && !time && !slot?.scheduleSessionId) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key || '') || !/^([01]\d|2[0-3]):[0-5]\d$/.test(time || '') || !validWallTime(key, time, zone)) bookingError('Choose a valid date and time in the business timezone.');
  if (`${key} ${time}` <= `${today.dateKey} ${today.time}`) bookingError('Choose a future time.');
  const notice = bookingNoticeMinutes(rules.bookingNoticeMinutes ?? rules.bookingNotice);
  const wallDistance = (wallTimeMillis(key,time,zone) - now) / 60000;
  if (notice && wallDistance < notice) bookingError('That time is within the minimum booking notice.');
  const limitDays = rules.maxAdvanceBookingDays ?? 90;
  const limit = rules.maxAdvanceBookingUntil || (Number(limitDays) > 0 ? new Date(Date.parse(`${today.dateKey}T12:00:00Z`) + Number(limitDays) * 86400000).toISOString().slice(0, 10) : '9999-12-31');
  if (key > limit) bookingError('That date is beyond the booking window.');
  const duration = Math.max(15, Number(booking.durationMinutes) || Number(String(booking.serviceDuration || service.duration || '60').replace(/[^\d.]/g, '')) || 60);
  const start = minutes(time); const end = start + duration;
  const busy = bookings.filter((b) => b.id !== booking.id && !['cancelled', 'declined', 'waitlist'].includes(b.status) && (rules.holdMode === 'confirmed_only' || rules.holdMode === 'confirmed' ? b.status === 'confirmed' : rules.holdMode === 'pending_only' ? b.status === 'pending' : true));
  const isClass = (booking.scheduleType || service.scheduleType) === 'class_session';
  if (isClass) {
    const sessions = service.sessions || [{ id: service.id, dateKey: service.sessionStartDate, time: service.sessionStartTime, capacity: service.capacity || service.sessionCapacity }];
    const session = sessions.find((s) => (s.dateKey || s.date) === key && (s.time || s.startTime) === time && (!slot.scheduleSessionId || s.id === slot.scheduleSessionId));
    if (!session) bookingError('Choose an existing session for this service.');
    const capacity = Number(session.capacity || service.capacity || service.sessionCapacity);
    if (!Number.isFinite(capacity) || capacity < 1) bookingError('This session needs a valid capacity before it can be booked.');
    const occupied = busy.filter((b) => b.serviceId === booking.serviceId && (b.dateKey || b.date) === key && b.time === time).reduce((sum, b) => sum + Math.max(1, Number(b.partySize) || 1), 0);
    if (occupied + Math.max(1, Number(booking.partySize) || 1) > capacity) bookingError('This session is now full.');
  } else if (!firstCome) {
    const previousDate = new Date(Date.parse(`${key}T12:00:00Z`) - 86400000).toISOString().slice(0, 10);
    const ranges = [...workingRanges(workspace, booking.staffId, key), ...workingRanges(workspace, booking.staffId, previousDate).filter(([, b]) => b > 1440).map(([a, b]) => [a - 1440, b - 1440])];
    if (!ranges.some(([a, b]) => start >= a && end <= b)) bookingError('That time is outside available working hours.');
  }
  const absoluteStart = Date.parse(`${key}T${time}:00Z`) / 60000;
  if (busy.some((b) => {
    if (booking.staffId && b.staffId && booking.staffId !== b.staffId) return false;
    if (isClass && b.serviceId === booking.serviceId && (b.dateKey || b.date) === key && b.time === time) return false;
    const otherStart = Date.parse(`${b.dateKey || b.date}T${b.time}:00Z`) / 60000;
    return overlaps(absoluteStart, absoluteStart + duration, otherStart, otherStart + (Number(b.durationMinutes) || 60));
  })) bookingError('That time is no longer available.');
  return true;
}
export function availableRescheduleSlots(workspace, booking, dateKey, bookings = [], now = Date.now()) {
  const service = (workspace.services || []).find((s) => s.id === booking.serviceId);
  const isClass = (booking.scheduleType || service?.scheduleType) === 'class_session';
  const interval = Number(workspace.availabilityRules?.slotDurationMode === 'custom' ? workspace.availabilityRules.slotDurationMinutes : workspace.availabilityRules?.arrivalIntervalMinutes || 15);
  if (!Number.isSafeInteger(interval) || interval < 5 || interval > 1440) bookingError('Correct the booking interval setting.');
  const candidates = isClass ? (service?.sessions || [{ id: service?.id, dateKey: service?.sessionStartDate, time: service?.sessionStartTime }]).filter((s) => (s.dateKey || s.date) === dateKey).map((s) => ({ dateKey, time: s.time || s.startTime, scheduleSessionId: s.id || '' })) : Array.from({ length: Math.ceil(1440 / interval) }, (_, i) => ({ dateKey, time: `${String(Math.floor(i * interval / 60)).padStart(2, '0')}:${String(i * interval % 60).padStart(2, '0')}` }));
  return candidates.filter((slot) => { if (sameSlot(slot, bookingSlot(booking))) return false; try { validateBookingSlot(workspace, booking, slot, bookings, now); return true; } catch { return false; } });
}
export function nextProposal({ current, booking, actor, action, slot, note = '', expectedRevision = 0, now = Date.now(), id }) {
  if (!['pending', 'confirmed'].includes(booking.status)) bookingError('Only active bookings can be rescheduled.');
  if (action !== 'propose') {
    if (!current || current.status !== 'pending' || current.revision !== expectedRevision) bookingError('This proposal has changed. Refresh and try again.', 'aborted');
    if (!sameSlot(current.original, bookingSlot(booking))) bookingError('The booking changed since this proposal was made.', 'aborted');
    if (current.bookingFingerprint !== bookingFingerprint(booking)) bookingError('The booking changed since this proposal was made.', 'aborted');
    if (action === 'withdraw' ? actor !== current.proposer : actor === current.proposer) bookingError('Only the other party can respond to this proposal.', 'permission-denied');
  } else if (current?.status === 'pending') bookingError('Respond to the pending proposal first.', 'already-exists');
  if (['propose', 'counter'].includes(action)) {
    if (!slot || sameSlot(slot, bookingSlot(booking))) bookingError('Choose a different time.');
    return { id, bookingId: booking.id, bookingFingerprint: bookingFingerprint(booking), original: bookingSlot(booking), proposed: slot, proposer: actor, status: 'pending', revision: (current?.revision || 0) + 1, note: String(note).trim().slice(0, 500), createdAt: current?.createdAt || now, updatedAt: now };
  }
  const statuses = { accept: 'accepted', decline: 'declined', withdraw: 'withdrawn' };
  if (!statuses[action]) bookingError('Unknown proposal action.', 'invalid-argument');
  return { ...current, status: statuses[action], updatedAt: now };
}
