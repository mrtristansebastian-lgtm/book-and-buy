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
const appOverlays = read('src/components/AppOverlays.jsx');
const bookingServicesSection = read('src/features/booking-flow/components/BookingServicesSection.jsx');
const publicBookingWorkspace = read('src/features/public-booking/hooks/usePublicBookingWorkspace.js');
const firebasePaths = read('src/shared/firebase/paths.ts');
const paymentsFunction = read('functions/payments/index.js');
const playwrightConfig = read('playwright.config.mjs');
const revenueE2e = read('tests/e2e/revenue-path.spec.mjs');

expect(bookingDeskModel.includes('createBookingDeskModel'), 'Bookings desk should use a pure model for filtering and sorting.');
expect(bookingDesk.includes('data-testid="booking-desk"'), 'Bookings desk needs a stable E2E selector.');
expect(bookingRecordRow.includes('data-testid="booking-record-row"'), 'Booking rows need a stable E2E selector.');
expect(bookingRecordRow.includes('booking-action-mark-paid'), 'Manual paid action needs a stable E2E selector.');
expect(bookingRecordRow.includes('data-testid="booking-action-info"'), 'Booking info action needs a stable E2E selector.');
expect(manualBookingSheet.includes('data-testid="manual-booking-form"'), 'Manual booking form needs a stable E2E selector.');
expect(manualBookingSheet.includes('data-testid="manual-booking-submit"'), 'Manual booking submit action needs a stable E2E selector.');
expect(appOverlays.includes('data-testid="confirm-action-dialog"'), 'Confirmation dialog needs a stable E2E selector.');
expect(bookingServicesSection.includes('data-testid="booking-service-option"'), 'Public booking service cards need stable E2E selectors.');
expect(publicBookingWorkspace.includes('loadGatewayOption') && publicBookingWorkspace.includes('isPermissionDenied'), 'Public payment option loading should tolerate denied hosted gateway reads per gateway.');
expect(bookingSubmissionActions.includes("'createOwnerBookingRequest'"), 'Owner bookings must continue using createOwnerBookingRequest.');
expect(bookingSubmissionActions.includes("'createPublicBookingRequest'"), 'Public bookings must continue using createPublicBookingRequest.');
expect(firebasePaths.includes('markManualBookingPaid: "markManualBookingPaid"'), 'Typed callable names must include markManualBookingPaid.');
expect(bookingLifecycleActions.includes("'markManualBookingPaid'"), 'Manual paid action must continue using markManualBookingPaid.');
expect(!bookingLifecycleActions.includes('applying local booking status update'), 'Configured manual payments must not mark paid locally after callable failure.');
expect(bookingLifecycleActions.includes('Payment could not be confirmed on the server.'), 'Callable payment failures should surface to the owner.');
expect(bookingPaymentModel.includes('isManualPaymentMarkable'), 'Manual payment logic should reject hosted gateways before calling the server.');
expect(paymentsFunction.includes("['manual_eft', 'cash', 'manual']"), 'Server manual payment callable should only allow manual/cash methods.');
expect(playwrightConfig.includes('webServer') && playwrightConfig.includes('4174'), 'Playwright should start a deterministic local Vite server.');
expect(playwrightConfig.includes('reuseExistingServer: false'), 'Playwright revenue flows should not reuse stale local servers.');
expect(revenueE2e.includes('page.addInitScript') && revenueE2e.includes('build-a-booking-guest-mode'), 'Booking E2E should seed guest mode before app boot.');
expect(revenueE2e.includes('manual-booking-submit') && revenueE2e.includes('Mark ${clientName} booking as paid'), 'Booking E2E should cover manual booking and mark-paid controls.');

if (failures.length) {
  console.error('Revenue path check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Revenue path check passed.');
