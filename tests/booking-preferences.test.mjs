import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCancellationNotice } from '../src/utils/bookingPreferences.js';
test('cancellation notice parses structured durations without treating legacy prose as a duration', () => {
  assert.deepEqual(parseCancellationNotice('24 hours'), { amount: 24, unit: 'hours' });
  assert.deepEqual(parseCancellationNotice('1 DAY'), { amount: 1, unit: 'days' });
  assert.deepEqual(parseCancellationNotice('2 weeks'), { amount: 2, unit: 'weeks' });
  for (const value of ['', '0 hours', '-1 hours', '1.5 days', 'Contact us before cancellation']) assert.equal(parseCancellationNotice(value), null);
});
