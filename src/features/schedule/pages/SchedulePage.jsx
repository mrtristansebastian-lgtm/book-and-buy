import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { addDays, formatDisplayDate, parseDateKey, toDateKey } from '../../../utils/dates';

export function SchedulePage() {
  const { bookings, staff, confirmBooking } = useWorkspace();
  const [day, setDay] = useState(() => toDateKey(new Date()));

  const dayBookings = useMemo(
    () =>
      bookings
        .filter((booking) => (booking.dateKey || booking.date) === day)
        .filter((booking) => !['declined', 'cancelled'].includes(booking.status))
        .sort((a, b) => String(a.time).localeCompare(String(b.time))),
    [bookings, day]
  );

  const lanes = useMemo(() => {
    const named = staff.map((member) => ({
      ...member,
      items: dayBookings.filter((booking) => booking.staffId === member.id)
    }));
    const unassigned = dayBookings.filter((booking) => !booking.staffId);
    return [
      ...named,
      ...(unassigned.length
        ? [{ id: 'unassigned', name: 'Unassigned', color: '#667085', items: unassigned }]
        : [])
    ];
  }, [staff, dayBookings]);

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Schedule</h1>
          <p className="bb-muted m-0">Today’s board — confirmed and pending bookings by staff.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            className="bb-ghost-btn px-3"
            onClick={() => setDay(toDateKey(addDays(parseDateKey(day) || new Date(), -1)))}
            aria-label="Previous day"
          >
            <ChevronLeft size={18} />
          </button>
          <div className="bb-panel px-4 py-2 font-semibold">{formatDisplayDate(day)}</div>
          <button
            type="button"
            className="bb-ghost-btn px-3"
            onClick={() => setDay(toDateKey(addDays(parseDateKey(day) || new Date(), 1)))}
            aria-label="Next day"
          >
            <ChevronRight size={18} />
          </button>
          <button type="button" className="bb-ink-btn" onClick={() => setDay(toDateKey(new Date()))}>
            Today
          </button>
        </div>
      </header>

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {lanes.map((lane) => (
          <div key={lane.id} className="bb-panel p-4 grid gap-3 content-start">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: lane.color || '#050505' }}
              />
              <h2 className="bb-page-title text-lg m-0">{lane.name}</h2>
            </div>
            {lane.items.length === 0 ? (
              <p className="bb-muted m-0 text-sm">No bookings.</p>
            ) : (
              lane.items.map((booking) => (
                <article key={booking.id} className="rounded-xl border border-black/8 p-3 grid gap-2 bg-white">
                  <div className="flex justify-between gap-2">
                    <strong>{booking.time}</strong>
                    <span className="text-xs uppercase font-bold tracking-wide">{booking.status}</span>
                  </div>
                  <div className="text-sm font-semibold">{booking.serviceName}</div>
                  <div className="bb-muted text-sm">{booking.clientName}</div>
                  {booking.status === 'pending' ? (
                    <button
                      type="button"
                      className="bb-primary-btn text-sm py-2"
                      onClick={() => confirmBooking(booking.id)}
                    >
                      Confirm
                    </button>
                  ) : null}
                </article>
              ))
            )}
          </div>
        ))}
      </section>
    </div>
  );
}
