import { expect, test } from '@playwright/test';

const guestModeKey = 'build-a-booking-guest-mode';
const exampleModeKey = 'build-a-booking-example-mode-v2';
const calendarPreferenceKey = 'bookify:schedule-view:v1';

const seedGuestWorkspace = async (page, { example = false } = {}) => {
  await page.addInitScript(({ guestKey, exampleKey, preferenceKey, useExample }) => {
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(guestKey, 'true');
    if (useExample) window.localStorage.setItem(exampleKey, 'true');
    window.localStorage.removeItem(preferenceKey);
  }, {
    guestKey: guestModeKey,
    exampleKey: exampleModeKey,
    preferenceKey: calendarPreferenceKey,
    useExample: example
  });
};

const waitForCalendar = page => page.locator('.schedule-calendar-workspace').waitFor({
  state: 'visible',
  timeout: 60_000
});

test('example schedule supports adaptive views, filters, grouping, and read-only details', async ({ page }) => {
  test.setTimeout(180_000);
  await seedGuestWorkspace(page, { example: true });
  await page.goto('/#/dashboard/schedule', { waitUntil: 'domcontentloaded' });

  await waitForCalendar(page);
  await expect(page.locator('.schedule-calendar-view-switcher .is-active')).toHaveText('Week');
  await expect(page.locator('.schedule-week-matrix-row')).toHaveCount(4);
  await expect(page.locator('.schedule-week-summary-card')).toHaveCount(28);
  await expect(page.locator('.schedule-calendar-create')).toBeDisabled();

  const weekSummary = page.locator('.schedule-week-summary-card.has-bookings').first();
  await expect(weekSummary).toBeVisible();
  await weekSummary.click();
  await expect(page.locator('.schedule-calendar-view-switcher .is-active')).toHaveText('Day');
  await expect(page.locator('.schedule-time-grid-resource')).toHaveCount(1);
  await page.getByRole('button', { name: 'Calendar filters' }).click();
  await page.locator('.schedule-calendar-staff-options button').first().click();

  await page.getByRole('button', { name: 'Month', exact: true }).click();
  await expect(page.locator('.schedule-month-summary-grid .schedule-month-summary-card')).toHaveCount(42);

  await page.getByRole('button', { name: 'List', exact: true }).click();
  await expect(page.locator('.schedule-timeline.is-embedded')).toBeVisible();
  await expect(page.locator('.schedule-timeline.is-embedded .schedule-timeline-head')).toHaveCount(0);

  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await expect(page.locator('.schedule-resource-day-row')).toHaveCount(4);
  await expect(page.locator('.schedule-resource-day-event').first()).toBeVisible();
  await page.getByRole('button', { name: 'Calendar filters' }).click();
  await page.locator('.schedule-calendar-staff-options button').nth(1).click();
  await expect(page.locator('.schedule-calendar-view-switcher .is-active')).toHaveText('Day');
  await expect(page.locator('.schedule-time-grid-resource')).toHaveCount(1);

  await page.locator('.schedule-calendar-event').first().click();
  await expect(page.locator('.schedule-booking-drawer')).toBeVisible();
  await expect(page.locator('.schedule-booking-readonly')).toBeVisible();
  await expect(page.locator('.schedule-booking-save')).toBeDisabled();
  await page.keyboard.press('Escape');
  await expect(page.locator('.schedule-booking-drawer')).toHaveCount(0);
  await expect(page.locator('.schedule-calendar-event').first()).toBeFocused();
});

test('mobile schedule defaults to a focused Day/List workspace', async ({ page }) => {
  test.setTimeout(90_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedGuestWorkspace(page, { example: true });
  await page.goto('/#/dashboard/schedule', { waitUntil: 'domcontentloaded' });

  await waitForCalendar(page);
  await expect(page.locator('.schedule-calendar-view-switcher .is-active')).toHaveText('Day');
  await expect(page.getByRole('button', { name: 'Week', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'Month', exact: true })).toBeHidden();
  await expect(page.getByRole('button', { name: 'List', exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'Calendar filters' }).click();
  await expect(page.locator('.schedule-calendar-filter-popover')).toBeVisible();
});

test('normal guest can open a prefilled booking drawer from a future calendar cell', async ({ page }) => {
  await seedGuestWorkspace(page);
  await page.goto('/#/dashboard/schedule', { waitUntil: 'domcontentloaded' });

  await waitForCalendar(page);
  await page.getByRole('button', { name: 'Day', exact: true }).click();
  await page.getByRole('button', { name: 'Next date range' }).click();
  const futureCell = page.locator(
    '.schedule-resource-day-cell:not(:disabled), .schedule-time-grid-cell:not(:disabled)'
  ).first();
  await expect(futureCell).toBeVisible();
  await futureCell.click();
  await expect(page.locator('.schedule-booking-drawer')).toBeVisible();
  await expect(page.locator('.schedule-booking-drawer h3')).toHaveText('Add to calendar');
  await expect(page.locator('.schedule-booking-readonly')).toHaveCount(0);
});
