import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { X } from 'lucide-react';
import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';
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
  const panelRef = useRef(null);
  useDialogFocus(panelRef, Boolean(service), onClose);
  const [actionError, setActionError] = useState('');
  const [pendingId, setPendingId] = useState('');
  const actionLock = useRef(false);
  const confirm = async (id) => {
    if (actionLock.current) return;
    actionLock.current = true; setPendingId(id); setActionError('');
    try { await onConfirm?.(id); }
    catch (error) { setActionError(error.message || 'The booking was not changed.'); }
    finally { actionLock.current = false; setPendingId(''); }
  };
  if (!service || typeof document === 'undefined') return null;

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

  return createPortal(
    <div
      className="bb-services-sheet"
      role="dialog"
      aria-modal="true"
      aria-label={`${service.name} details`}
    >
      <div className="bb-services-sheet-backdrop" onClick={onClose} />
      <div ref={panelRef} tabIndex={-1} className="bb-services-sheet-panel bb-schedule-spot-sheet">
        {actionError && <p className="bb-reschedule-error" role="alert">{actionError}</p>}
        <header className="bb-services-sheet-head">
          <div className="bb-schedule-spot-sheet-head">
            <div className={`bb-schedule-spot-sheet-thumb${imageSrc ? '' : ' is-empty'}`}>
              {imageSrc ? <img src={imageSrc} alt="" /> : null}
            </div>
            <div className="bb-schedule-spot-sheet-copy">
              <p className="bb-services-sheet-eyebrow">Spot programme</p>
              <h2 className="bb-services-sheet-title">{service.name}</h2>
              <StatusBadge className={`bb-schedule-spot-pill is-${status}`} status={status} label={statusLabel(status)} />
            </div>
          </div>
          <button type="button" className="bb-ghost-btn bb-services-sheet-close" aria-label="Close session details" onClick={onClose}>
            <X size={16} aria-hidden="true" />
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
                      <StatusBadge className="bb-schedule-booking-status" status={booking.status} label={booking.status} />
                    </div>
                    <div className="bb-schedule-booking-client">
                      {booking.clientEmail || booking.clientPhone || 'No contact'}
                    </div>
                    {booking.status === 'pending' ? (
                      <Button action="confirm" variant="positive"
                        busy={pendingId === booking.id}
                        busyLabel="Confirming…"
                        disabled={Boolean(pendingId)}
                        type="button"
                        className="bb-primary-btn text-sm py-2"
                        onClick={() => confirm(booking.id)}
                      >
                        Confirm seat
                      </Button>
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
            <Button action="close" variant="secondary" type="button" className="bb-primary-btn" onClick={onClose}>
              Close
            </Button>
          </div>
        </footer>
      </div>
    </div>, document.body
  );
}
