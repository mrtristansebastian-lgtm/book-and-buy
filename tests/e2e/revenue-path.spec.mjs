import { expect, test } from '@playwright/test';

const guestModeKey = 'build-a-booking-guest-mode';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(key, 'true');
  }, guestModeKey);
});

test('guest owner can add a manual booking and mark manual payment paid', async ({ page }) => {
  const clientName = `QA Revenue Client ${Date.now()}`;

  await page.goto('/#/dashboard/bookings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByTestId('booking-desk')).toBeVisible();

  await page.getByTestId('booking-open-manual-booking').click();
  await expect(page.getByTestId('manual-booking-form')).toBeVisible();
  await page.getByTestId('manual-booking-client-name').fill(clientName);
  await page.getByTestId('manual-booking-date').fill('2026-06-10');
  await page.getByTestId('manual-booking-time').fill('10:30');
  await page.getByTestId('manual-booking-payment-method').selectOption('cash');
  await page.getByTestId('manual-booking-payment-status').selectOption('manual_pending');
  await page.getByTestId('manual-booking-submit').click();

  await expect(page.getByTestId('manual-booking-form')).toHaveCount(0);
  const bookingRow = page.getByTestId('booking-record-row').filter({ hasText: clientName });
  await expect(bookingRow).toBeVisible();

  await bookingRow.getByRole('button', { name: `View booking information for ${clientName}` }).click();
  await expect(page.getByTestId('booking-info-dialog')).toBeVisible();
  await page.getByTestId('booking-info-close').click();
  await expect(page.getByTestId('booking-info-dialog')).toHaveCount(0);

  await bookingRow.getByRole('button', { name: `Send running late update to ${clientName}` }).click();
  await expect(page.getByTestId('running-late-dialog')).toBeVisible();
  await page.getByTestId('running-late-minutes').fill('12');
  await page.getByTestId('running-late-close').click();
  await expect(page.getByTestId('running-late-dialog')).toHaveCount(0);

  await bookingRow.getByRole('button', { name: `Mark ${clientName} booking as paid` }).click();
  await expect(page.getByTestId('confirm-action-dialog')).toBeVisible();
  await page.getByTestId('confirm-action-confirm').click();
  await expect(bookingRow.getByRole('button', { name: `${clientName} payment is paid` })).toBeVisible();
});

test('guest public booking page exposes the booking selection controls', async ({ page }) => {
  await page.goto('/#/book/your-business', { waitUntil: 'domcontentloaded' });

  await expect(page.getByText('Your Business').first()).toBeVisible();
  await expect(page.getByTestId('booking-add-to-cart')).toBeVisible();

  const serviceCards = page.getByTestId('booking-service-option');
  if (await serviceCards.count()) {
    await serviceCards.first().click();
  }
});
