import test from 'node:test';
import assert from 'node:assert/strict';
import { visibleScheduleStaff } from '../src/features/schedule/utils/dayOverview.js';
const staff = [{ id: 'one', name: 'One' }, { id: 'two', name: 'Two' }];
test('the mobile overview retains bookings with no assigned or retired staff', () => {
  const rows = visibleScheduleStaff(staff, [{ staffId: 'one' }, { staffId: '' }, { staffId: 'retired' }]);
  assert.deepEqual(rows.map((row) => row.id), ['one', 'two', '__unassigned__']);
  assert.equal(visibleScheduleStaff([], [{ staffId: 'retired' }])[0].name, 'All bookings');
});
test('staff filtering does not leak unassigned bookings into another team calendar', () => {
  assert.deepEqual(visibleScheduleStaff(staff, [{ staffId: '' }], 'two'), [staff[1]]);
  assert.deepEqual(visibleScheduleStaff(staff, [], 'missing'), []);
  assert.deepEqual(visibleScheduleStaff(staff, [{ staffId: 'one' }]), staff);
});
