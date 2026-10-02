import test from 'node:test';
import assert from 'node:assert/strict';
import { matchesInboxFilter, toggleInboxFilter } from '../src/features/support/utils/threadFilters.js';

test('business inbox defaults to all; pressing the selected filter clears it', () => {
  assert.equal(matchesInboxFilter({}, 'all'), true);
  for (const filter of ['unread', 'pending', 'bookings', 'orders']) {
    assert.equal(toggleInboxFilter('all', filter), filter);
    assert.equal(toggleInboxFilter(filter, filter), 'all');
  }
});
test('business filters use unread, last client response and linked records', () => {
  const thread = { unread: true, bookingId: 'booking', messages: [{ from: 'business' }, { from: 'client' }] };
  assert.equal(matchesInboxFilter(thread, 'unread'), true);
  assert.equal(matchesInboxFilter(thread, 'pending'), true);
  assert.equal(matchesInboxFilter(thread, 'bookings'), true);
  assert.equal(matchesInboxFilter(thread, 'orders'), false);
  assert.equal(matchesInboxFilter({ ...thread, messages: [{ from: 'business' }] }, 'pending'), false);
});
