/** Include every booking once, including records with missing or retired staff. */
export function visibleScheduleStaff(staff = [], bookings = [], selectedId = '') {
  if (selectedId) return staff.filter((member) => String(member.id) === String(selectedId));
  if (!staff.length) return [{ id: '', name: 'All bookings', color: '#101828' }];
  const known = new Set(staff.map((member) => String(member.id)));
  return bookings.some((booking) => !known.has(String(booking.staffId || '')))
    ? [...staff, { id: '__unassigned__', name: 'Unassigned bookings', color: '#101828' }]
    : staff;
}
