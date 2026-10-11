import { isRetiredEventService } from './serviceTemplates.js';
/** Timing is independent of the Slot / Spot format. */
export function serviceTimingOptions(service = {}) {
  const type = String(service.scheduleType || service.bookingType || service.serviceType || '').trim().toLowerCase().replace(/[-\s]+/g, '_');
  const group = ['class_session', 'class', 'classes', 'event', 'group', 'workshop', 'session'].includes(type);
  return [group
    ? { id: 'fixed', label: 'Fixed dates & times', description: 'A class, workshop or programme with a set start and end.' }
    : { id: 'availability', label: 'Client chooses an available time', description: 'Use your business and team hours to offer bookable time slots.' },
    { id: 'arranged', label: 'Arrange with the client', description: 'Agree a date, time or ongoing schedule together in messages.' },
    { id: 'to_be_announced', label: 'Dates to be announced', description: 'Show the service now. Clients can ask about dates before booking opens.' }];
}
export function getServiceTimingMode(service = {}) {
  return service.timingMode || serviceTimingOptions(service)[0].id;
}
export function serviceNeedsTimingConversation(service = {}) {
  return ['arranged', 'to_be_announced'].includes(getServiceTimingMode(service));
}
export function serviceTimingLabel(service = {}) {
  return serviceTimingOptions(service).find(option => option.id === getServiceTimingMode(service))?.label || '';
}
export function validateServiceTiming(service = {}) {
  if (isRetiredEventService(service)) return 'Event bookings are no longer supported. Choose a Slot or Spot.';
  if (service.timingMode != null && !serviceTimingOptions(service).some(option => option.id === service.timingMode)) return 'Choose a valid timing option for this service.';
  if (service.timingNotes != null && (typeof service.timingNotes !== 'string' || service.timingNotes.length > 600)) return 'Keep timing details to 600 characters or fewer.';
  return '';
}
