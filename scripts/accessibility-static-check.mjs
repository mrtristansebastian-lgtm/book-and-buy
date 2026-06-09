import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];

const read = (relativePath) => {
  const filePath = path.join(root, relativePath);
  if (!existsSync(filePath)) {
    failures.push(`Missing ${relativePath}`);
    return '';
  }
  return readFileSync(filePath, 'utf8');
};

const expect = (condition, message) => {
  if (!condition) failures.push(message);
};

const indexHtml = read('index.html');
const publicServicesCss = read('src/styles/booking/public-services/category-rail.css');
const bookingCheckoutCss = read('src/styles/booking/preview-mobile/checkout-funnel.css');
const manualBookingSheet = read('src/features/bookings/components/ManualBookingSheet.jsx');
const bookingDateSection = read('src/features/booking-flow/components/BookingDateSection.jsx');
const appOverlays = read('src/components/AppOverlays.jsx');
const mobileNav = read('src/features/dashboard/components/MobileWorkspaceNav.jsx');

expect(indexHtml.includes('<html lang="en">'), 'Document language must be declared.');
expect(indexHtml.includes('name="viewport"'), 'Viewport meta tag must be present for mobile accessibility.');
expect(publicServicesCss.includes(':focus-visible'), 'Booking service category controls need visible keyboard focus.');
expect(bookingCheckoutCss.includes(':focus') || bookingCheckoutCss.includes(':focus-within'), 'Checkout controls need visible focus states.');
expect(manualBookingSheet.includes('aria-label="Close manual booking form"'), 'Manual booking sheet close button needs an accessible label.');
expect(manualBookingSheet.includes('data-testid="manual-booking-form"'), 'Manual booking sheet needs a stable QA selector.');
expect(bookingDateSection.includes('role="dialog"') && bookingDateSection.includes('aria-modal="true"'), 'Booking date picker must expose dialog semantics.');
expect(appOverlays.includes('data-testid="confirm-action-dialog"'), 'Confirmation dialog needs stable QA coverage.');
expect(mobileNav.includes('aria-label="Mobile workspace navigation"'), 'Mobile navigation must expose a navigation label.');
expect(mobileNav.includes('aria-expanded={mobileNavOpen}'), 'Mobile more navigation must expose expanded state.');

if (failures.length) {
  console.error('Accessibility static check failed:');
  failures.forEach((failure) => console.error(`- ${failure}`));
  process.exit(1);
}

console.log('Accessibility static guard passed.');
