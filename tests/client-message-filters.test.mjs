import test from 'node:test';
import assert from 'node:assert/strict';
import { isClientThreadUnread, matchesClientMessageFilter } from '../src/features/client-app/clientMessageFilters.js';

test('customer unread is independent of seller unread, including legacy threads', () => {
  assert.equal(isClientThreadUnread({ unread: true }), false);
  assert.equal(isClientThreadUnread({ unread: true, unreadForClient: false }), false);
  assert.equal(isClientThreadUnread({ unread: false, unreadForClient: true }), true);
  assert.equal(isClientThreadUnread(null), false);
});
test('booking and order filters require linked records, not ambiguous subject text', () => {
  assert.equal(matchesClientMessageFilter({ bookingId: 'b1' }, 'bookings'), true);
  assert.equal(matchesClientMessageFilter({ orderId: 'o1' }, 'orders'), true);
  assert.equal(matchesClientMessageFilter({ subject: 'Re: opening hours' }, 'bookings'), false);
  assert.equal(matchesClientMessageFilter({ subject: 'Order enquiries' }, 'orders'), false);
  assert.equal(matchesClientMessageFilter({}, 'all'), true);
  assert.equal(matchesClientMessageFilter({}, 'waiting'), false);
});
