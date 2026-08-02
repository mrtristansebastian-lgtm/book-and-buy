const SCHEDULE_TYPE_IDS = Object.freeze([
  'appointment',
  'class_session'
]);

const SCHEDULE_TYPE_ALIASES = Object.freeze({
  appointment: 'appointment',
  appointments: 'appointment',
  service: 'appointment',
  one_to_one: 'appointment',
  class: 'class_session',
  classes: 'class_session',
  class_session: 'class_session',
  group: 'class_session',
  group_session: 'class_session',
  workshop: 'class_session',
  seat: 'class_session',
  seats: 'class_session',
  session: 'class_session',
  sessions: 'class_session',
  mobile: 'appointment',
  mobile_job: 'appointment',
  field_service: 'appointment',
  dispatch: 'appointment',
  trade: 'appointment',
  trade_service: 'appointment',
  trade_services: 'appointment',
  event: 'class_session',
  events: 'class_session',
  package: 'class_session',
  event_package: 'class_session'
});

const normalizeScheduleType = (value) => {
  const key = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  return SCHEDULE_TYPE_ALIASES[key] || 'appointment';
};

const getServiceScheduleType = (service = {}) => normalizeScheduleType(
  service.scheduleType || service.bookingType || service.serviceType
);

const getBookingScheduleType = (booking = {}, service = {}) => normalizeScheduleType(
  booking.scheduleType ||
  booking.serviceScheduleType ||
  booking.bookingType ||
  booking.serviceType ||
  getServiceScheduleType(service)
);

const scheduleTypeRequiresApproval = () => false;

module.exports = {
  SCHEDULE_TYPE_IDS,
  getBookingScheduleType,
  getServiceScheduleType,
  normalizeScheduleType,
  scheduleTypeRequiresApproval
};
