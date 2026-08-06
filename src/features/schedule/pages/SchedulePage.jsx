import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Settings2 } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { addDays, formatDisplayDate, parseDateKey, toDateKey } from '../../../utils/dates';

export function SchedulePage() {
  const { bookings, staff, confirmBooking, workspace, updateAvailabilityRules } = useWorkspace();
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [hoursOpen, setHoursOpen] = useState(false);
  const [hoursDraft, setHoursDraft] = useState({
    businessOpenTime: workspace.availabilityRules?.businessOpenTime || '09:00',
    businessCloseTime: workspace.availabilityRules?.businessCloseTime || '17:00'
  });

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

  const saveHours = () => {
    updateAvailabilityRules(hoursDraft);
    setHoursOpen(false);
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Schedule</h1>
          <p className="bb-muted m-0">
            Day board by staff · open{' '}
            {workspace.availabilityRules?.businessOpenTime || '09:00'}–
            {workspace.availabilityRules?.businessCloseTime || '17:00'}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="bb-ghost-btn"
            onClick={() => {
              setHoursDraft({
                businessOpenTime: workspace.availabilityRules?.businessOpenTime || '09:00',
                businessCloseTime: workspace.availabilityRules?.businessCloseTime || '17:00'
              });
              setHoursOpen(true);
            }}
          >
            <Settings2 size={16} /> Hours
          </button>
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

      {dayBookings.length === 0 ? (
        <div className="bb-panel p-6 grid gap-2">
          <p className="bb-page-title text-xl m-0">Quiet day</p>
          <p className="bb-muted m-0 text-sm">
            No confirmed or pending bookings on this date. Manual bookings land here from Services →
            Requests.
          </p>
        </div>
      ) : null}

      <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        {lanes.map((lane) => (
          <div key={lane.id} className="bb-panel p-4 grid gap-3 content-start min-h-[180px]">
            <div className="flex items-center gap-2">
              <span
                className="inline-block w-2.5 h-2.5 rounded-full"
                style={{ background: lane.color || '#050505' }}
              />
              <h2 className="bb-page-title text-lg m-0">{lane.name}</h2>
              <span className="bb-muted text-xs ml-auto">{lane.items.length}</span>
            </div>
            {lane.items.length === 0 ? (
              <p className="bb-muted m-0 text-sm">Open lane</p>
            ) : (
              lane.items.map((booking) => (
                <article
                  key={booking.id}
                  className="rounded-xl border border-black/8 p-3 grid gap-2 bg-white"
                >
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

      {hoursOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-center p-4">
          <div className="bb-panel w-full max-w-md p-5 grid gap-3">
            <h2 className="bb-page-title text-2xl m-0">Business hours</h2>
            <p className="bb-muted m-0 text-sm">
              Light hours settings used for public availability slots.
            </p>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Opens</span>
              <input
                type="time"
                className="native-control-input px-4"
                value={hoursDraft.businessOpenTime}
                onChange={(event) =>
                  setHoursDraft((prev) => ({ ...prev, businessOpenTime: event.target.value }))
                }
              />
            </label>
            <label className="grid gap-1 text-sm">
              <span className="font-semibold">Closes</span>
              <input
                type="time"
                className="native-control-input px-4"
                value={hoursDraft.businessCloseTime}
                onChange={(event) =>
                  setHoursDraft((prev) => ({ ...prev, businessCloseTime: event.target.value }))
                }
              />
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className="bb-ghost-btn" onClick={() => setHoursOpen(false)}>
                Cancel
              </button>
              <button type="button" className="bb-primary-btn" onClick={saveHours}>
                Save hours
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
