import { expect, test } from '@playwright/test';

const guestModeKey = 'build-a-booking-guest-mode';
const exampleModeKey = 'build-a-booking-example-mode-v2';
const calendarPreferenceKey = 'bookify:schedule-operations-view:v2';

const staffIds = ['jordan-lee', 'thando-mokoena', 'maya-patel', 'sofia-martins'];

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

const waitForBoard = page => page.getByTestId('schedule-operations-board').waitFor({
  state: 'visible',
  timeout: 60_000
});

const viewButton = (page, view) => page.getByTestId(`schedule-view-${view}`);
const bookingCards = page => page.locator('[data-testid^="schedule-booking-card-"]');
const weekDayCards = page => page.locator('[data-testid^="schedule-week-day-"]');
const monthDayCards = page => page.locator('[data-testid^="schedule-month-day-"]');

const expectPressed = (locator) => expect(locator).toHaveAttribute('aria-pressed', 'true');
const futureDateKey = (daysAhead) => {
  const date = new Date();
  date.setDate(date.getDate() + daysAhead);
  return [date.getFullYear(), String(date.getMonth() + 1).padStart(2, '0'), String(date.getDate()).padStart(2, '0')].join('-');
};

async function completeBookingDraft(panel, { clientName, dateKey, serviceIndex, staffId, time = '16:00' }) {
  await panel.getByLabel('Client name').fill(clientName);
  await panel.getByRole('combobox', { name: 'Service' }).selectOption({ index: serviceIndex });
  await panel.getByRole('combobox', { name: 'Assigned staff' }).selectOption(staffId);
  await panel.getByLabel('Date').fill(dateKey);
  await panel.getByLabel('Time').fill(time);
}

test('owner moves between business, staff, week, and month schedule boards', async ({ page }) => {
  test.setTimeout(180_000);
  await seedGuestWorkspace(page, { example: true });
  await page.goto('/#/dashboard/schedule', { waitUntil: 'domcontentloaded' });

  await waitForBoard(page);
  await test.step('Business board opens as the owner default', async () => {
    await expectPressed(page.getByTestId('schedule-scope-business'));
    await expectPressed(viewButton(page, 'day'));
    for (const staffId of staffIds) {
      await expect(page.getByTestId(`schedule-day-lane-${staffId}`)).toBeVisible();
    }
  });

  await test.step('A staff profile focuses the board on that staff member', async () => {
    await page.getByTestId('schedule-scope-staff-jordan-lee').click();
    await expectPressed(page.getByTestId('schedule-scope-staff-jordan-lee'));
    await expect(page.getByTestId('schedule-day-lane-jordan-lee')).toBeVisible();
    await expect(page.getByTestId('schedule-day-lane-thando-mokoena')).toHaveCount(0);
  });

  await test.step('Week and month cards drill into a selected day board', async () => {
    await viewButton(page, 'week').click();
    await expectPressed(viewButton(page, 'week'));
    await expect(weekDayCards(page).first()).toBeVisible();
    await weekDayCards(page).first().click();
    await expectPressed(viewButton(page, 'day'));
    await expect(page.getByTestId('schedule-day-lane-jordan-lee')).toBeVisible();

    await viewButton(page, 'month').click();
    await expectPressed(viewButton(page, 'month'));
    await expect(monthDayCards(page).first()).toBeVisible();
    await monthDayCards(page).first().click();
    await expectPressed(viewButton(page, 'day'));
  });
});

test('the staff rail scopes the board, the legend explains card colours, and bookings open the command panel', async ({ page }) => {
  test.setTimeout(180_000);
  await seedGuestWorkspace(page, { example: true });
  await page.goto('/#/dashboard/schedule', { waitUntil: 'domcontentloaded' });

  await waitForBoard(page);
  await test.step('The compact scope rail replaces the floating filter and the card colours are explained', async () => {
    await expect(page.getByTestId('schedule-filters-trigger')).toHaveCount(0);
    await expect(page.getByTestId('schedule-status-legend')).toContainText('confirmed');
    await expect(page.getByTestId('schedule-status-legend')).toContainText('waitlist');
    await page.getByTestId('schedule-scope-staff-jordan-lee').click();
    await expectPressed(page.getByTestId('schedule-scope-staff-jordan-lee'));
  });

  await test.step('An appointment exposes its existing booking details', async () => {
    await expect(bookingCards(page).first()).toBeVisible();
    await bookingCards(page).first().click();
    const commandPanel = page.getByTestId('schedule-command-panel');
    await expect(commandPanel).toBeVisible();
    await expect(page.getByTestId('schedule-command-save')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(commandPanel).toBeHidden();
  });
});

test('mobile schedule keeps the operations board within the viewport', async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  await seedGuestWorkspace(page, { example: true });
  await page.goto('/#/dashboard/schedule', { waitUntil: 'domcontentloaded' });

  await waitForBoard(page);
  await expectPressed(viewButton(page, 'day'));
  await expect(page.getByTestId('schedule-scope-business')).toBeVisible();
  await page.getByTestId('schedule-scope-staff-jordan-lee').click();
  await expectPressed(page.getByTestId('schedule-scope-staff-jordan-lee'));
  await expect(page.getByTestId('schedule-day-lane-jordan-lee')).toBeVisible();

  await viewButton(page, 'week').click();
  await expect(weekDayCards(page).first()).toBeVisible();
  await viewButton(page, 'agenda').click();
  await expectPressed(viewButton(page, 'agenda'));
  await expect(viewButton(page, 'agenda')).toContainText('List');
  const agendaDays = page.locator('[data-testid^="schedule-agenda-day-"]');
  await expect(agendaDays).toHaveCount(7);
  await expect(agendaDays.first()).toBeVisible();
  await agendaDays.nth(1).getByRole('button').click();
  await expect(agendaDays.nth(1).getByRole('button')).toHaveAttribute('aria-expanded', 'true');

  await viewButton(page, 'month').click();
  await expectPressed(viewButton(page, 'month'));
  await expect(monthDayCards(page).first()).toBeVisible();

  await expect.poll(() => page.evaluate(() => (
    document.documentElement.scrollWidth <= window.innerWidth && document.body.scrollWidth <= window.innerWidth
  ))).toBe(true);
});

test('an editable workspace opens new and edit commands, then prevents a same-staff conflict', async ({ page }) => {
  test.setTimeout(180_000);
  await seedGuestWorkspace(page, { example: true });
  await page.goto('/#/dashboard/schedule', { waitUntil: 'domcontentloaded' });

  await waitForBoard(page);
  const commandPanel = page.getByTestId('schedule-command-panel');
  const save = page.getByTestId('schedule-command-save');
  let existingDate;
  let existingTime;
  let existingService;
  let existingStaff;

  await test.step('An existing booking opens a ready-to-save edit command', async () => {
    await expect(bookingCards(page).first()).toBeVisible();
    await bookingCards(page).first().click();
    await expect(commandPanel).toBeVisible();
    existingDate = await commandPanel.getByLabel('Date').inputValue();
    existingTime = await commandPanel.getByLabel('Time').inputValue();
    existingService = await commandPanel.getByRole('combobox', { name: 'Service' }).inputValue();
    existingStaff = await commandPanel.getByRole('combobox', { name: 'Assigned staff' }).inputValue();
    await commandPanel.getByLabel('Client name').fill('Schedule E2E Updated');
    await expect(save).toBeEnabled();
    await page.keyboard.press('Escape');
    await expect(commandPanel).toBeHidden();
  });

  await test.step('A new command is blocked when it overlaps the same staff member', async () => {
    await page.getByTestId('schedule-create').click();
    await expect(commandPanel).toBeVisible();
    await commandPanel.getByLabel('Client name').fill('Schedule E2E Conflict');
    await commandPanel.getByRole('combobox', { name: 'Service' }).selectOption(existingService);
    await commandPanel.getByRole('combobox', { name: 'Assigned staff' }).selectOption(existingStaff);
    await commandPanel.getByLabel('Date').fill(existingDate);
    await commandPanel.getByLabel('Time').fill(existingTime);
    await expect(page.getByTestId('schedule-command-conflict')).toBeVisible();
    await expect(save).toBeDisabled();
  });
});
