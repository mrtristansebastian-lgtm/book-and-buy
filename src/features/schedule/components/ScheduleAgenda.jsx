import { useEffect, useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { formatDisplayDate } from '../../../utils/dates';
import { isBusinessOpenOnDate } from '../../../utils/staffAvailability';
import { ScheduleBookingRow } from './ScheduleBookingRow';

export function ScheduleAgenda({ groups = [], todayKey, nextBooking, pendingIds = new Set(), conflictFor,
  availabilityRules = {}, filter = 'confirmed', onView, onClearFilter, resetKey }) {
  const [limit, setLimit] = useState(30);
  useEffect(() => setLimit(30), [resetKey]);
  const total = groups.reduce((count, group) => count + group.items.length, 0);
  let remaining = limit;
  const visible = groups.map(group => {
    const items = group.items.slice(0, Math.max(0, remaining));
    remaining -= items.length;
    return { ...group, items, total: group.items.length };
  }).filter(group => group.items.length);
  const emptyTitle = filter === 'reschedule' ? 'No reschedule requests for these dates' : filter === 'active' ? 'No bookings for these dates' : `No ${filter} bookings for these dates`;
  if (!total) return <div className="bb-agenda-empty"><CalendarDays size={26} strokeWidth={1.5} aria-hidden="true" /><h2>{emptyTitle}</h2><p>Choose another date{filter !== 'active' ? ' or show all active bookings' : ''} to see what’s on your schedule.</p>{filter !== 'active' ? <Button action="view" variant="secondary" onClick={onClearFilter}>Show all active bookings</Button> : null}</div>;
  return <section className="bb-agenda-list" aria-label="Booking agenda">
    {visible.map(group => <section className="bb-agenda-day" key={group.dateKey} aria-label={formatDisplayDate(group.dateKey)}>
      <header className="bb-agenda-day-head"><div><span className="bb-agenda-date-marker">{group.carryover ? 'Ongoing' : group.dateKey === todayKey ? 'Today' : (new Date(`${group.dateKey}T12:00:00`)).toLocaleDateString(undefined, { weekday: 'short' })}</span><h2>{group.carryover ? 'Started ' : ''}{formatDisplayDate(group.dateKey)}</h2></div><span>{group.items.length}{group.total > group.items.length ? ` of ${group.total}` : ''} booking{group.total === 1 ? '' : 's'}</span>{!isBusinessOpenOnDate(group.dateKey, availabilityRules) ? <span className="bb-agenda-closed-label">Business closed</span> : null}</header>
      <div className="bb-agenda-day-bookings">{group.items.map(row => <ScheduleBookingRow key={row.booking.id} row={row}
        conflict={conflictFor?.(row)} hasReschedule={pendingIds.has(row.booking.id)} isNext={nextBooking?.booking?.id === row.booking.id} onView={onView} />)}</div>
    </section>)}
    {limit < total ? <div className="bb-agenda-more"><span>Showing {Math.min(limit, total)} of {total} bookings</span><Button action="view" variant="secondary" onClick={() => setLimit(value => value + 30)}>Show more bookings</Button></div> : null}
  </section>;
}
