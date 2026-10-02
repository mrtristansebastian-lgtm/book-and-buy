/** Customer inbox state is independent of the business's unread flag. */
export function isClientThreadUnread(thread) {
  return Boolean(thread?.unreadForClient);
}

export function matchesClientMessageFilter(thread, filterId) {
  if (filterId === 'unread') return isClientThreadUnread(thread);
  if (filterId === 'bookings') return Boolean(thread?.bookingId);
  if (filterId === 'orders') return Boolean(thread?.orderId);
  return filterId === 'all';
}
