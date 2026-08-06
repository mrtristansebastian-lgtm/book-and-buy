export const SCHEDULE_TYPE_IDS = Object.freeze(['appointment', 'class_session']);

const ALIASES = Object.freeze({
  appointment: 'appointment',
  appointments: 'appointment',
  service: 'appointment',
  one_to_one: 'appointment',
  class: 'class_session',
  classes: 'class_session',
  class_session: 'class_session',
  group: 'class_session',
  workshop: 'class_session',
  session: 'class_session',
  event: 'class_session'
});

export const SCHEDULE_TYPE_OPTIONS = Object.freeze([
  {
    id: 'appointment',
    label: 'Appointments',
    singular: 'Appointment',
    setupLabel: 'Book an appointment',
    description: 'One client booking a set time with you or a staff member.'
  },
  {
    id: 'class_session',
    label: 'Spots',
    singular: 'Spot booking',
    setupLabel: 'Book a spot',
    description: 'Classes, workshops, and group sessions where clients reserve a spot.'
  }
]);

export const normalizeScheduleType = (value) => {
  const key = String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[-\s]+/g, '_');
  return ALIASES[key] || 'appointment';
};

export const getServiceScheduleType = (service = {}) =>
  normalizeScheduleType(service.scheduleType || service.bookingType || service.serviceType);

export const getScheduleTypeMeta = (value) =>
  SCHEDULE_TYPE_OPTIONS.find((option) => option.id === normalizeScheduleType(value)) ||
  SCHEDULE_TYPE_OPTIONS[0];
