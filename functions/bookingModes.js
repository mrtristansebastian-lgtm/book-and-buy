import { getServiceTimingMode, serviceTimingOptions } from './serviceTiming.js';

// Group sessions keep their published dates and seat limits in either business mode.
export function isFirstComeService(workspace, service) {
  return Boolean(service) && workspace?.availabilityRules?.scheduleMode === 'first_come' && serviceTimingOptions(service)[0].id === 'availability' && getServiceTimingMode(service) === 'availability';
}

export function isFirstComeBooking(workspace, service, booking) {
  return serviceTimingOptions(service)[0].id === 'availability' && getServiceTimingMode(service) === 'availability' &&
    booking?.bookingMode === 'first_come';
}

export function isUnscheduledBooking(booking) {
  return booking?.bookingMode === 'first_come' && !(booking.dateKey || booking.date) && !booking.time;
}

// Canonicalise intake on the server too: a caller cannot opt out of slot validation.
export function bookingIntake(workspace, service, input, old, publicRequest) {
  if (publicRequest && input.bookingMode === 'first_come' && !isFirstComeService(workspace, service)) {
    throw new Error('This service requires its normal booking flow. Refresh and try again.');
  }
  const mode = old ? old.bookingMode || 'time_slots' : isFirstComeService(workspace, service) ? 'first_come' : 'time_slots';
  if (publicRequest && mode === 'first_come') {
    if (input.bookingMode !== 'first_come') throw new Error('This service accepts booking requests without selecting a time. Refresh and submit a request.');
    return { bookingMode: mode, date: '', dateKey: '', time: '', scheduleSessionId: '', staffId: '', staffName: '', partySize: 1, paymentMethod: 'cash' };
  }
  return { bookingMode: mode };
}
