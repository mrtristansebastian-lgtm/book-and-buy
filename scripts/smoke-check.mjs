import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const read = (relativePath) => {
  const filePath = join(root, relativePath);
  if (!existsSync(filePath)) {
    failures.push(`Missing ${relativePath}`);
    return '';
  }
  return readFileSync(filePath, 'utf8');
};

const appRouteHost = read('src/components/AppRouteHost.jsx');
const bookingFlow = read('src/components/BookingFlow.jsx');
const bookingCheckoutStep = read('src/features/booking-flow/components/BookingCheckoutStep.jsx');
const bookingSuccessState = read('src/features/booking-flow/components/BookingSuccessState.jsx');
const bookingSubmissionActions = read('src/features/bookings/actions/bookingSubmissionActions.js');
const dashboardOverlays = read('src/features/dashboard/components/DashboardOverlays.jsx');
const firebaseService = read('src/services/firebase.js');
const functionsIndex = read('functions/index.js');
const firebaseJson = read('firebase.json');
const legalConfig = read('src/config/legalConfig.js');
const publicBookingWorkspace = read('src/features/public-booking/hooks/usePublicBookingWorkspace.js');

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

expect(bookingSubmissionActions.includes('createPublicBookingRequest'), 'Public bookings should use the server-safe callable when available.');
expect(publicBookingWorkspace.includes('publicReloadKey'), 'Public booking pages need a retry path.');
expect(appRouteHost.includes('legalPages') && legalConfig.includes('privacy'), 'Landing page should expose trust/legal/support surfaces.');
expect(dashboardOverlays.includes('setConfirmDialog') && dashboardOverlays.includes('ConfirmActionDialog'), 'Destructive actions should use branded confirmation UI.');
expect(
  bookingFlow.includes('What happens next')
    || bookingCheckoutStep.includes('business reviews your request')
    || bookingSuccessState.includes('review the booking details')
    || bookingSuccessState.includes('confirm the slot'),
  'Booking page should explain the post-submit flow.'
);
expect(firebaseService.includes('getFunctions') && firebaseService.includes('httpsCallable'), 'Firebase Functions should be available to the app.');
expect(functionsIndex.includes('runTransaction') && functionsIndex.includes('slotLocks'), 'Server booking function should reserve slots transactionally.');
expect(firebaseJson.includes('"functions"'), 'Firebase config should include the Functions source.');

if (failures.length) {
  console.error('Smoke check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Smoke check passed.');
