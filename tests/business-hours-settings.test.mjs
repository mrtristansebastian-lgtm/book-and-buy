import test from 'node:test';
import assert from 'node:assert/strict';
import { seedWeekdayHours, buildBusinessHoursPatch } from '../src/features/schedule/utils/businessHoursSettings.js';

test('weekly hours preserve existing open days and legacy defaults', () => {
  const draft = seedWeekdayHours({ openWeekdays: ['mon', 'fri'], businessOpenTime: '08:00', businessCloseTime: '18:00' });
  assert.equal(draft.mon.open, true);
  assert.equal(draft.tue.open, false);
  assert.equal(draft.fri.openTime, '08:00');
  assert.deepEqual(buildBusinessHoursPatch(draft).openWeekdays, ['mon', 'fri']);
});

test('weekly hours permit overnight and 24-hour schedules', () => {
  const draft = seedWeekdayHours({ openWeekdays: ['mon'] });
  draft.mon = { open: true, openTime: '22:00', closeTime: '06:00' };
  assert.equal(buildBusinessHoursPatch(draft).businessCloseTime, '06:00');
  draft.mon.closeTime = '22:00';
  assert.ok(buildBusinessHoursPatch(draft));
});

test('weekly hours reject malformed times and completely closed schedules', () => {
  const draft = seedWeekdayHours({ openWeekdays: ['mon'] });
  draft.mon.openTime = '25:00';
  assert.equal(buildBusinessHoursPatch(draft), null);
  draft.mon.open = false;
  assert.equal(buildBusinessHoursPatch(draft), null);
});
