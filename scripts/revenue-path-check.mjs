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

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const bookingDesk = read('src/features/bookings/components/BookingDesk.jsx');
const bookingDeskModel = read('src/features/bookings/utils/bookingDeskModel.js');
const bookingLifecycleActions = read('src/features/bookings/actions/bookingLifecycleActions.js');
const bookingPaymentModel = read('src/features/bookings/utils/bookingPaymentModel.js');
const bookingRecordRow = read('src/features/bookings/components/BookingRecordRow.jsx');
const bookingSubmissionActions = read('src/features/bookings/actions/bookingSubmissionActions.js');
const manualBookingSheet = read('src/features/bookings/components/ManualBookingSheet.jsx');
const firebasePaths = read('src/shared/firebase/paths.ts');
const paymentsFunction = read('functions/payments/index.js');

expect(bookingDeskModel.includes('createBookingDeskModel'), 'Bookings desk should use a pure model for filtering and sorting.');
expect(bookingDesk.includes('data-testid="booking-desk"'), 'Bookings desk needs a stable E2E selector.');
expect(bookingRecordRow.includes('data-testid="booking-record-row"'), 'Booking rows need a stable E2E selector.');
expect(bookingRecordRow.includes('booking-action-mark-paid'), 'Manual paid action needs a stable E2E selector.');
expect(manualBookingSheet.includes('data-testid="manual-booking-form"'), 'Manual booking form needs a stable E2E selector.');
expect(manualBookingSheet.includes('data-testid="manual-booking-submit"'), 'Manual booking submit action needs a stable E2E selector.');
expect(bookingSubmissionActions.includes("'createOwnerBookingRequest'"), 'Owner bookings must continue using createOwnerBookingRequest.');
expect(bookingSubmissionActions.includes("'createPublicBookingRequest'"), 'Public bookings must continue using createPublicBookingRequest.');
expect(firebasePaths.includes('markManualBookingPaid: "markManualBookingPaid"'), 'Typed callable names must include markManualBookingPaid.');
expect(bookingLifecycleActions.includes("'markManualBookingPaid'"), 'Manual paid action must continue using markManualBookingPaid.');
expect(!bookingLifecycleActions.includes('applying local booking status update'), 'Configured manual payments must not mark paid locally after callable failure.');
expect(bookingLifecycleActions.includes('Payment could not be confirmed on the server.'), 'Callable payment failures should surface to the owner.');
expect(bookingPaymentModel.includes('isManualPaymentMarkable'), 'Manual payment logic should reject hosted gateways before calling the server.');
expect(paymentsFunction.includes("['manual_eft', 'cash', 'manual']"), 'Server manual payment callable should only allow manual/cash methods.');

if (failures.length) {
  console.error('Revenue path check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Revenue path check passed.');
