export const BOOKING_LIST_FILTERS = [
  { id: 'pending', label: 'Pending' }, { id: 'confirmed', label: 'Confirmed' },
  { id: 'waitlist', label: 'Waitlist' }, { id: 'reschedule', label: 'Reschedule requested' }
];

export function groupStaffBookings(bookings, staff, { day, staffId = '', filter = '', pendingIds = new Set() }) {
  const groups = new Map();
  for (const booking of bookings || []) {
    if (String(booking.dateKey || booking.date || '') !== day) continue;
    if (staffId && booking.staffId !== staffId) continue;
    if (!['pending', 'confirmed', 'waitlist'].includes(booking.status)) continue;
    if (filter === 'reschedule' ? !pendingIds.has(booking.id) : filter && booking.status !== filter) continue;
    const id = booking.staffId || '';
    if (!groups.has(id)) groups.set(id, { id, member: staff.find(s => s.id === id) || { name: id ? 'Former staff member' : 'Unassigned' }, items: [] });
    groups.get(id).items.push(booking);
  }
  for (const group of groups.values()) group.items.sort((a,b) => String(a.time || '').localeCompare(String(b.time || '')) || String(a.clientName || '').localeCompare(String(b.clientName || '')));
  return [...groups.values()].sort((a,b) => a.id === '' ? 1 : b.id === '' ? -1 : a.member.name.localeCompare(b.member.name));
}

export function pendingDemoRescheduleIds(threads = []) {
  const ids = new Set();
  for (const thread of threads) {
    const latest = [...(thread.messages || [])].reverse().find(m => m.type === 'reschedule' && m.proposal);
    if (thread.bookingId && latest?.proposal.status === 'pending') ids.add(thread.bookingId);
  }
  return ids;
}
