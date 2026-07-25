import { expect, test } from '@playwright/test';

const guestModeKey = 'build-a-booking-guest-mode';
const exampleModeKey = 'build-a-booking-example-mode-v2';
const publicPreviewKey = 'build-a-booking-guest-public-preview-v2';

const expectPortraitsToDecode = async (page, locator) => {
  const sources = await locator.evaluateAll(images => (
    [...new Set(images.map(image => image.getAttribute('src')).filter(Boolean))]
  ));
  expect(sources.length).toBeGreaterThan(0);
  const failedSources = await page.evaluate(async portraitSources => {
    const results = await Promise.all(portraitSources.map(source => new Promise(resolve => {
      const image = new Image();
      image.onload = () => resolve(image.naturalWidth > 0 ? '' : source);
      image.onerror = () => resolve(source);
      image.src = source;
    })));
    return results.filter(Boolean);
  }, sources);
  expect(failedSources).toEqual([]);
};

const seedBlankGuest = async page => {
  await page.addInitScript(({ guestKey, exampleKey }) => {
    if (window.sessionStorage.getItem('workspace-example-test-seeded') === 'true') return;
    window.localStorage.clear();
    window.sessionStorage.clear();
    window.localStorage.setItem(guestKey, 'true');
    window.localStorage.removeItem(exampleKey);
    window.sessionStorage.setItem('workspace-example-test-seeded', 'true');
  }, { guestKey: guestModeKey, exampleKey: exampleModeKey });
};

test('compact example data stays coherent across dashboard sections and public preview', async ({ page }) => {
  test.setTimeout(180_000);
  await seedBlankGuest(page);
  await page.goto('/#/dashboard/overview', { waitUntil: 'domcontentloaded' });

  const toggle = page.getByRole('switch', { name: 'Example data' });
  await expect(toggle).toBeVisible({ timeout: 60_000 });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect(page.getByText('Read-only example')).toBeVisible();
  await expect.poll(() => page.evaluate(key => window.localStorage.getItem(key), exampleModeKey)).toBe('true');
  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('switch', { name: 'Example data' })).toHaveAttribute('aria-checked', 'true');

  await page.goto('/#/dashboard/editor', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Flame & Flour').first()).toBeVisible({ timeout: 60_000 });
  const editorBusinessImages = page.locator('img[src*="/example/flour-and-flame/"]');
  await expect(editorBusinessImages).toHaveCount(13);
  await expectPortraitsToDecode(page, editorBusinessImages);

  await page.goto('/#/dashboard/services', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Pasta From Scratch').first()).toBeVisible({ timeout: 60_000 });
  const serviceImages = page.locator('img[src*="/example/flour-and-flame/services/"]');
  await expect(serviceImages.first()).toBeVisible();
  await expectPortraitsToDecode(page, serviceImages);

  await page.goto('/#/dashboard/clients', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Aisha Naidoo')).toBeVisible({ timeout: 60_000 });
  const clientPortraits = page.locator('img[src*="/example/your-business/people/clients/"]');
  await expect(clientPortraits).toHaveCount(12);
  await expectPortraitsToDecode(page, clientPortraits);

  await page.goto('/#/dashboard/team', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Jordan Lee')).toBeVisible({ timeout: 60_000 });
  const staffPortraits = page.locator('img[src*="/example/your-business/people/staff/"]');
  await expect(staffPortraits).toHaveCount(4);
  await expectPortraitsToDecode(page, staffPortraits);

  await page.goto('/#/dashboard/support', { waitUntil: 'domcontentloaded' });
  const threadRows = page.locator('.support-thread-row');
  await expect(threadRows).toHaveCount(12, { timeout: 60_000 });
  const threadNames = await page.locator('.support-thread-client-name').allTextContents();
  expect(new Set(threadNames).size).toBe(12);
  const threadPortraits = threadRows.locator('img[src*="/example/your-business/people/clients/"]');
  await expect(threadPortraits).toHaveCount(12);
  await expectPortraitsToDecode(page, threadPortraits);
  for (let threadIndex = 0; threadIndex < 12; threadIndex += 1) {
    await threadRows.nth(threadIndex).click();
    await expect(page.locator('.support-chat-canvas .support-message-bubble')).toHaveCount(4);
  }

  await page.goto('/#/dashboard/bookings', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Aisha Naidoo').first()).toBeVisible({ timeout: 60_000 });
  const bookingPortraits = page.locator('img[src*="/example/your-business/people/clients/"]');
  await expect(bookingPortraits.first()).toBeVisible();
  await expectPortraitsToDecode(page, bookingPortraits);

  await page.goto('/#/dashboard/schedule', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('.schedule-week-matrix-row')).toHaveCount(4, { timeout: 60_000 });
  const schedulePortraits = page.locator('img[src*="/example/your-business/people/staff/"]');
  await expect(schedulePortraits.first()).toBeVisible();
  await expectPortraitsToDecode(page, schedulePortraits);
  await expect(page.locator('.schedule-calendar-create')).toBeDisabled();

  const publicSnapshot = await page.evaluate(key => JSON.parse(window.localStorage.getItem(key) || 'null'), publicPreviewKey);
  expect(publicSnapshot.version).toBe(3);
  expect(publicSnapshot.staff).toHaveLength(4);
  expect(publicSnapshot.staff.every(staff => staff.photoURL.includes('/example/your-business/people/staff/'))).toBe(true);

  await page.goto('/#/book/your-business', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Flame & Flour').first()).toBeVisible({ timeout: 60_000 });
  await expect(page.getByRole('heading', { name: 'Pasta From Scratch', exact: true })).toBeVisible();
  const publicBusinessImages = page.locator('img[src*="/example/flour-and-flame/"]');
  await expect(publicBusinessImages).toHaveCount(13);
  await expectPortraitsToDecode(page, publicBusinessImages);
  await expect(page.locator('body')).not.toContainText('Kinetic House');
  await expect(page.locator('body')).not.toContainText('Your Online Studio');

  await page.goto('/#/dashboard/overview', { waitUntil: 'domcontentloaded' });
  const activeToggle = page.getByRole('switch', { name: 'Example data' });
  await expect(activeToggle).toHaveAttribute('aria-checked', 'true');
  await activeToggle.click();
  await expect(activeToggle).toHaveAttribute('aria-checked', 'false');
  await expect.poll(() => page.evaluate(key => window.localStorage.getItem(key), exampleModeKey)).toBeNull();
  await page.goto('/#/dashboard/clients', { waitUntil: 'domcontentloaded' });
  await expect(page.getByText('Aisha Naidoo')).toHaveCount(0);
});
