export const SCHEDULE_TYPE_IDS = Object.freeze([
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

export const SCHEDULE_TYPE_OPTIONS = Object.freeze([
  {
    id: 'appointment',
    label: 'Appointments',
    singular: 'Appointment',
    shortLabel: 'Appointments',
    setupLabel: 'Book an appointment',
    description: 'For one client booking a set time with you or a staff member.',
    scheduleLabel: 'Appointments'
  },
  {
    id: 'class_session',
    label: 'Spots',
    singular: 'Spot booking',
    shortLabel: 'Spots',
    setupLabel: 'Book a spot',
    description: 'For classes, workshops, sessions, group bookings, and anything clients reserve a spot for.',
    scheduleLabel: 'Spots'
  }
]);

export const normalizeScheduleType = (value) => {
  const key = String(value || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  return SCHEDULE_TYPE_ALIASES[key] || 'appointment';
};

export const getServiceScheduleType = (service = {}) => normalizeScheduleType(
  service.scheduleType || service.bookingType || service.serviceType
);

export const getBookingScheduleType = (booking = {}, service = {}) => normalizeScheduleType(
  booking.scheduleType ||
  booking.serviceScheduleType ||
  booking.bookingType ||
  booking.serviceType ||
  getServiceScheduleType(service)
);

export const getScheduleTypeMeta = (value) => (
  SCHEDULE_TYPE_OPTIONS.find(option => option.id === normalizeScheduleType(value)) ||
  SCHEDULE_TYPE_OPTIONS[0]
);

export const scheduleTypeRequiresApproval = () => false;

export const getScheduleTypeOptionsForServices = (services = []) => {
  const present = new Set((Array.isArray(services) ? services : [])
    .map(getServiceScheduleType)
    .filter(Boolean));
  if (!present.size) present.add('appointment');
  if (present.has('appointment') && present.size === 1) return [getScheduleTypeMeta('appointment')];
  return SCHEDULE_TYPE_OPTIONS.filter(option => present.has(option.id));
};
