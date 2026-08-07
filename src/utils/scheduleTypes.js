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
    label: 'Slots',
    singular: 'Slot',
    setupLabel: 'Book a slot',
    description: 'For booking a time slot for one individual.'
  },
  {
    id: 'class_session',
    label: 'Spots',
    singular: 'Spot',
    setupLabel: 'Book a Spot',
    description: 'For multiple open spots in a class or programme.'
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
