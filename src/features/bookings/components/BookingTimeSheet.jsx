import { useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../../shared/ui/Button';
import { DateField } from '../../../shared/ui/DateField';
import { TimeField } from '../../../shared/ui/TimeField';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { businessClock, validateBookingSlot } from '../../../../functions/bookingDomain';

export function BookingTimeSheet({ booking, onClose }) {
  const { workspace, updateBooking } = useWorkspace();
  const ref = useRef(null);
  const [dateKey, setDateKey] = useState(booking.dateKey || booking.date || '');
  const [time, setTime] = useState(booking.time || '');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useDialogFocus(ref, true, () => { if (!busy) onClose(); });
  const save = async () => {
    setBusy(true); setError('');
    try {
      validateBookingSlot(workspace, booking, { dateKey, time }, workspace.bookings);
      const result = await updateBooking(booking.id, { date: dateKey, dateKey, time });
      if (!result) throw new Error('The booking could not be updated. Refresh and try again.');
      onClose();
    } catch (failure) { setError(failure.message); }
    finally { setBusy(false); }
  };
  return createPortal(<div className="bb-services-sheet bb-app-sheet" role="dialog" aria-modal="true" aria-label="Arrange booking time">
    <div className="bb-services-sheet-backdrop" onClick={() => { if (!busy) onClose(); }} />
    <div className="bb-services-sheet-panel" ref={ref} tabIndex={-1}>
      <header className="bb-services-sheet-head"><div><p className="bb-services-sheet-eyebrow">{booking.clientName}</p><h2 className="bb-services-sheet-title">{booking.time ? 'Reschedule booking' : 'Set a booking time'}</h2><p>{booking.serviceName}</p></div><Button action="close" variant="secondary" disabled={busy} onClick={onClose}>Close</Button></header>
      <div className="bb-services-sheet-body grid gap-4">
        <p>Choose the time agreed with your client. You don’t need published availability or staff shifts. Existing bookings are checked for clashes.</p>
        <p className="bb-muted text-sm">Times use {workspace.timezone || 'UTC'}. The booking’s confirmation and payment status stay the same.</p>
        <DateField label="Date" value={dateKey} onChange={setDateKey} min={businessClock(workspace.timezone || 'UTC').dateKey} disabled={busy} />
        <TimeField label="Time" value={time} onChange={setTime} disabled={busy} />
        {error && <p className="bb-reschedule-error" role="alert">{error}</p>}
      </div>
      <footer className="bb-services-sheet-footer"><Button action="save" variant="primary" busy={busy} disabled={!dateKey || !time} onClick={save}>Save agreed time</Button></footer>
    </div>
  </div>, document.body);
}
