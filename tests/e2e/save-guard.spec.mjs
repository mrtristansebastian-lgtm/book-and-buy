import { expect, test } from '@playwright/test';

const guestModeKey = 'build-a-booking-guest-mode';

test.beforeEach(async ({ page }) => {
  await page.addInitScript((key) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(key, 'true');
  }, guestModeKey);
});

test('workspace navigation prompts only after unsaved profile edits and respects cancel', async ({ page }) => {
  await page.goto('/#/dashboard/profile', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: /Open Account & Access/i }).click();
  await expect(page.getByPlaceholder('First name')).toBeVisible();

  await page.getByPlaceholder('First name').fill(`QA ${Date.now()}`);
  const dialogPromise = new Promise((resolve) => {
    page.once('dialog', async (dialog) => {
      const message = dialog.message();
      await dialog.dismiss();
      resolve(message);
    });
  });
  await page.getByRole('button', { name: /BOOKINGS/i }).click();
  const dialogMessage = await dialogPromise;

  expect(dialogMessage).toContain('Unsaved changes in Profile');
  await expect(page.getByPlaceholder('First name')).toBeVisible();
  await expect(page).toHaveURL(/#\/dashboard\/profile/);
});

test('saved schedule edits can leave the page without another prompt', async ({ page }) => {
  await page.goto('/#/dashboard/business', { waitUntil: 'domcontentloaded' });
  const dayToggle = page.getByRole('button', { name: /^(Close|Open) selected day$/i });
  await expect(dayToggle).toBeVisible();

  await dayToggle.click();
  await page.getByRole('button', { name: /^Save$/ }).click();

  page.on('dialog', async (dialog) => {
    await dialog.dismiss();
    throw new Error(`Unexpected unsaved-changes prompt after save: ${dialog.message()}`);
  });
  await page.getByRole('button', { name: /BOOKINGS/i }).click();
  await expect(page.getByTestId('booking-desk')).toBeVisible();
});
