import { X } from 'lucide-react';
import {
  countServiceSpotBookings,
  getServiceOpenSpots,
  getSpotSessionStatus
} from '../../../utils/services';
import {
  ACTIVE,
  formatSessionPart,
  resolveStaffNames,
  statusLabel
} from '../pages/schedulePageUtils';

export function SpotInfoSheet({ service, staff, bookings, onClose, onConfirm }) {
  if (!service) return null;

  const capacity = Math.max(1, Number(service.capacity) || 1);
  const booked = countServiceSpotBookings(service, bookings);
  const open = getServiceOpenSpots(service, bookings);
  const status = getSpotSessionStatus(service);
  const staffNames = resolveStaffNames(service, staff);
  const imageSrc = service.imageUrls?.[0] || '';
  const seatBookings = bookings
    .filter((booking) => booking.serviceId === service.id)
    .filter((booking) => ACTIVE.has(String(booking.status || '')))
    .sort((a, b) => String(b.createdAt || 0).localeCompare(String(a.createdAt || 0)));

  return (
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`${service.name} details`}
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div className="bb-services-sheet-panel bb-schedule-spot-sheet">
        <header className="bb-services-sheet-head">
          <div className="bb-schedule-spot-sheet-head">
            <div className={`bb-schedule-spot-sheet-thumb${imageSrc ? '' : ' is-empty'}`}>
              {imageSrc ? <img src={imageSrc} alt="" /> : null}
            </div>
            <div className="bb-schedule-spot-sheet-copy">
              <p className="bb-services-sheet-eyebrow">Spot programme</p>
              <h2 className="bb-services-sheet-title">{service.name}</h2>
              <span className={`bb-schedule-spot-pill is-${status}`}>{statusLabel(status)}</span>
            </div>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" onClick={onClose}>
            <X size={16} />
          </button>
        </header>

        <div className="bb-services-sheet-body bb-schedule-spot-sheet-body">
          <dl className="bb-schedule-spot-sheet-facts">
            <div>
              <dt>Starts</dt>
              <dd>{formatSessionPart(service.sessionStartDate, service.sessionStartTime)}</dd>
            </div>
            <div>
              <dt>Ends</dt>
              <dd>{formatSessionPart(service.sessionEndDate, service.sessionEndTime)}</dd>
            </div>
            <div>
              <dt>Capacity</dt>
              <dd>
                {booked}/{capacity} booked · {open} open
              </dd>
            </div>
            <div>
              <dt>Staff</dt>
              <dd>{staffNames.length ? staffNames.join(', ') : 'No staff assigned'}</dd>
            </div>
          </dl>

          {String(service.description || '').trim() ? (
            <p className="bb-schedule-spot-sheet-desc">{service.description}</p>
          ) : null}

          <section className="bb-schedule-spot-sheet-seats">
            <h3 className="bb-schedule-spot-sheet-seats-title">Seat bookings</h3>
            {seatBookings.length === 0 ? (
              <p className="bb-schedule-lane-empty">No seat requests yet.</p>
            ) : (
              <div className="bb-schedule-spot-bookings">
                {seatBookings.map((booking) => (
                  <article key={booking.id} className="bb-schedule-booking">
                    <div className="bb-schedule-booking-top">
                      <strong>{booking.clientName || 'Guest'}</strong>
                      <span className="bb-schedule-booking-status">{booking.status}</span>
                    </div>
                    <div className="bb-schedule-booking-client">
                      {booking.clientEmail || booking.clientPhone || 'No contact'}
                    </div>
                    {booking.status === 'pending' ? (
                      <button
                        type="button"
                        className="bb-primary-btn text-sm py-2"
                        onClick={() => onConfirm?.(booking.id)}
                      >
                        Confirm seat
                      </button>
                    ) : null}
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>

        <footer className="bb-services-sheet-footer">
          <span />
          <div className="bb-services-sheet-footer-actions">
            <button type="button" className="bb-primary-btn" onClick={onClose}>
              Close
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}
