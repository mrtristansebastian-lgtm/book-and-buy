export function matchesInboxFilter(thread, filter) {
  if (filter === 'unread') return Boolean(thread.unread);
  if (filter === 'bookings') return Boolean(thread.bookingId);
  if (filter === 'orders') return Boolean(thread.orderId);
  if (filter === 'pending') return thread.messages?.at(-1)?.from === 'client';
  return true;
}

export function toggleInboxFilter(current, selected) {
  return current === selected ? 'all' : selected;
}
