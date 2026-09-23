import test from 'node:test';
import assert from 'node:assert/strict';

import {
  alignTimeToWindowMinutes,
  minutesToTime,
  resolveTimeWindowMinutes,
  timeToMinutes
} from '../src/utils/scheduleTime.js';

test('equal opening and closing times resolve to a 24-hour window', () => {
  assert.deepEqual(resolveTimeWindowMinutes('00:00', '00:00'), {
    start: 0,
    end: 1440,
    span: 1440
  });
});

test('overnight business hours continue into the following day', () => {
  const window = resolveTimeWindowMinutes('22:00', '02:00');
  assert.deepEqual(window, { start: 1320, end: 1560, span: 240 });
  assert.equal(alignTimeToWindowMinutes(timeToMinutes('01:00'), window.start, window.end), 1500);
});

test('normal daytime windows retain their original bounds', () => {
  assert.deepEqual(resolveTimeWindowMinutes('09:00', '17:00'), {
    start: 540,
    end: 1020,
    span: 480
  });
});

test('minute labels wrap cleanly at midnight', () => {
  assert.equal(minutesToTime(1440), '00:00');
  assert.equal(minutesToTime(1500), '01:00');
});
