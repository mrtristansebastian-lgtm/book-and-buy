import test from 'node:test';
import assert from 'node:assert/strict';
import { listActiveShifts, removeActiveShift } from '../src/features/schedule/utils/activeShifts.js';
import { getStaffDayWindows } from '../src/utils/staffAvailability.js';

const rules = { openWeekdays: ['mon', 'tue', 'wed', 'thu', 'fri'], businessOpenTime: '09:00', businessCloseTime: '17:00' };
const month = new Date(2026, 9, 1);

test('active shifts are bounded by month, today, booking window and closures', () => {
  const rows = listActiveShifts('staff', { staffId: 'staff' }, rules, month, '2026-10-05', '2026-10-09');
  assert.deepEqual(rows.map(row => row.date), ['2026-10-05', '2026-10-06', '2026-10-07', '2026-10-08', '2026-10-09']);
  assert.ok(rows.every(row => row.recurring));
});

test('deleting a recurring shift affects only that date and does not fall back to its template', () => {
  const entry = { staffId: 'staff' };
  const row = listActiveShifts('staff', entry, rules, month, '2026-10-05')[0];
  const next = removeActiveShift(entry, row, rules);
  assert.deepEqual(getStaffDayWindows('staff', row.date, { staff: next }, rules), []);
  assert.equal(getStaffDayWindows('staff', '2026-10-06', { staff: next }, rules).length, 1);
  assert.equal(entry.days, undefined);
});

test('deleting one split shift preserves the other shift and breaks', () => {
  const entry = { staffId: 'staff', days: { '2026-10-05': { open: true, status: 'open', ranges: [{ start: '09:00', end: '12:00' }, { start: '13:00', end: '17:00' }], breaks: [{ start: '15:00', end: '15:30' }] } } };
  const rows = listActiveShifts('staff', entry, rules, month, '2026-10-05');
  const next = removeActiveShift(entry, rows[0], rules);
  assert.deepEqual(next.days['2026-10-05'].ranges, [{ start: '13:00', end: '17:00' }]);
  assert.deepEqual(next.days['2026-10-05'].breaks, [{ start: '15:00', end: '15:30' }]);
});
