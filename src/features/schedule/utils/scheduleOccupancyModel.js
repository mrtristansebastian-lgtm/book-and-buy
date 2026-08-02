import { getBookingScheduleType, getServiceScheduleType } from '../../../utils/scheduleTypes.js';
import { parseScheduleDuration, parseScheduleTime, scheduleIntervalsOverlap } from './scheduleOperationsModel.js';

const EMPTY_LIST = Object.freeze([]);
const BLOCKING_STATUSES = new Set(['pending', 'confirmed']);

const cleanText = value => String(value ?? '').trim();
const asList = value => (Array.isArray(value) ? value : EMPTY_LIST);
const toDateKey = value => cleanText(value).slice(0, 10);

const getServiceById = (services = EMPTY_LIST) => {
  const byId = new Map();
  asList(services).forEach(service => {
    const id = cleanText(service?.id);
    if (id) byId.set(id, service);
  });
  return byId;
};

const bookingBlocksOccupancy = booking => (
  BLOCKING_STATUSES.has(cleanText(booking.status || 'pending').toLowerCase()) &&
  cleanText(booking.time).toLowerCase() !== 'waitlist'
);

const getRangeUnit = ({ booking, dateKey, key, scopeId, startMinutes, durationMinutes }) => ({
  booking,
  dateKey,
  durationMinutes,
  endMinutes: Math.min(24 * 60, startMinutes + durationMinutes),
  key,
  scopeId,
  startMinutes,
  type: 'range'
});

const getServiceSeatCapacity = (service = {}, fallback = 1) => {
  return Math.max(1, Math.round(Number(service.capacity || service.scheduleConfig?.capacity || fallback) || fallback));
};

export const getBookingOccupancyUnits = ({ booking = {}, services = EMPTY_LIST } = {}) => {
  if (!bookingBlocksOccupancy(booking)) return [];
  const servicesById = getServiceById(services);
  const service = servicesById.get(cleanText(booking.serviceId)) || {};
  const scheduleType = getBookingScheduleType(booking, service);
  const dateKey = toDateKey(booking.dateKey || booking.bookingDate);
  if (!dateKey) return [];

  if (scheduleType === 'class_session') {
    const sessionId = cleanText(booking.scheduleSessionId) || `${cleanText(booking.serviceId || booking.serviceName)}:${dateKey}:${cleanText(booking.time)}`;
    return [{
      booking,
      dateKey,
      key: `class_session:${sessionId}`,
      scopeId: sessionId,
      seats: Math.max(1, Math.round(Number(booking.partySize || 1) || 1)),
      type: 'capacity'
    }];
  }

  const startMinutes = parseScheduleTime(booking.time || booking.bookingTime);
  if (startMinutes === null) return [];
  const durationMinutes = parseScheduleDuration(
    booking.serviceDurationMinutes || booking.serviceDuration || booking.duration || service.duration,
    60
  );

  const staffId = cleanText(booking.staffId || booking.availabilityReservedStaffId);
  if (!staffId) return [];
  return [getRangeUnit({
    booking,
    dateKey,
    durationMinutes,
    key: `appointment:${staffId}:${dateKey}`,
    scopeId: staffId,
    startMinutes
  })];
};

export const getScheduleOccupancyConflicts = ({
  bookings = EMPTY_LIST,
  services = EMPTY_LIST,
  serviceCapacityById = new Map()
} = {}) => {
  const units = asList(bookings).flatMap(booking => getBookingOccupancyUnits({ booking, services }));
  const groups = new Map();
  units.forEach(unit => {
    const group = groups.get(unit.key) || [];
    group.push(unit);
    groups.set(unit.key, group);
  });

  const conflicts = [];
  groups.forEach((group, key) => {
    const first = group[0] || {};
    if (first.type === 'capacity') {
      const serviceId = cleanText(first.booking?.serviceId);
      const service = asList(services).find(item => cleanText(item?.id) === serviceId) || {};
      const capacity = getServiceSeatCapacity(service, serviceCapacityById.get(serviceId) || 1);
      const seats = group.reduce((total, unit) => total + (unit.seats || 1), 0);
      if (seats > capacity) conflicts.push({ key, type: 'capacity', capacity, seats, units: group });
      return;
    }
    const sorted = [...group].sort((left, right) => left.startMinutes - right.startMinutes || left.endMinutes - right.endMinutes);
    sorted.forEach((unit, index) => {
      sorted.slice(index + 1).forEach(other => {
        if (scheduleIntervalsOverlap(unit, other)) {
          conflicts.push({ key, type: 'range', left: unit, right: other, units: [unit, other] });
        }
      });
    });
  });
  return conflicts;
};

export const getScheduleTypeCounts = (services = EMPTY_LIST) => (
  asList(services).reduce((counts, service) => {
    const type = getServiceScheduleType(service);
    counts[type] = (counts[type] || 0) + 1;
    return counts;
  }, {})
);
