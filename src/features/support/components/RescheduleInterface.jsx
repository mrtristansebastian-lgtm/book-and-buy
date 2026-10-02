import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ArrowRight, CalendarDays, Clock3, X } from 'lucide-react';
import { bookingSlot } from '../../../../functions/bookingDomain';

function TimeLabel({ slot, timezone }) {
  if (!slot?.dateKey) return <span>Time unavailable</span>;
  const day = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeZone: 'UTC' }).format(new Date(`${slot.dateKey}T12:00:00Z`));
  return <span><strong>{day}</strong><span>{slot.time} <small>{timezone}</small></span></span>;
}
export function RescheduleCard({ proposal, controller, isCurrent }) {
  const actionable = isCurrent && proposal.status === 'pending'; const mine = proposal.proposer === controller.actor;
  return <article className={`bb-reschedule-card is-${proposal.status}`}>
    <header><span className="bb-reschedule-icon"><CalendarDays size={18} /></span><div><p>Booking time change</p><h3>{proposal.serviceName || 'Booking'}</h3></div><span className="bb-reschedule-status">{!isCurrent && proposal.status === 'pending' ? 'superseded' : proposal.status}</span></header>
    <div className="bb-reschedule-times"><div><small>Original time</small><TimeLabel slot={proposal.original} timezone={proposal.timezone} /></div><ArrowRight size={16} aria-hidden="true" /><div><small>{proposal.status === 'accepted' ? 'Confirmed time' : 'Proposed time'}</small><TimeLabel slot={proposal.proposed} timezone={proposal.timezone} /></div></div>
    {proposal.note && <p className="bb-reschedule-note">{proposal.note}</p>}
    {actionable && <><p className="bb-reschedule-hint">{mine ? 'Waiting for the other party to respond. Your original booking stays in place.' : 'Your booking changes only when you accept this time.'}</p><div className="bb-reschedule-actions">{mine ? <button disabled={controller.busy} onClick={() => controller.respond('withdraw')}>Withdraw request</button> : <><button className="bb-primary-btn" disabled={controller.busy} onClick={() => controller.respond('accept')}>Accept time</button><button disabled={controller.busy || !controller.clientAllowed && controller.actor === 'client'} onClick={controller.show}>Suggest another time</button><button disabled={controller.busy} onClick={() => controller.respond('decline')}>Decline</button></>}</div></>}
    {actionable && controller.error && <p className="bb-reschedule-error" role="alert">{controller.error}</p>}
  </article>;
}
export function RescheduleDialog({ controller }) {
  const [selected, setSelected] = useState(''); const [note, setNote] = useState(''); const dialogRef = useRef(null);
  useEffect(() => {
    if (!controller.open) return undefined;
    setSelected(''); setNote(''); const previous = document.activeElement; const dialog = dialogRef.current;
    dialog?.focus();
    const keydown = (event) => {
      if (event.key === 'Escape') controller.close();
      if (event.key !== 'Tab') return;
      const fields = [...dialog.querySelectorAll('button:not(:disabled), input, textarea, select, [tabindex="0"]')];
      const first = fields[0]; const last = fields[fields.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) { event.preventDefault(); last?.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    };
    dialog.addEventListener('keydown', keydown); const priorOverflow = document.body.style.overflow; document.body.style.overflow = 'hidden';
    return () => { dialog.removeEventListener('keydown', keydown); document.body.style.overflow = priorOverflow; previous?.focus?.(); };
  }, [controller.open]);
  useEffect(() => setSelected(''), [controller.dateKey]);
  if (!controller.open) return null;
  const counter = controller.proposal?.status === 'pending';
  return createPortal(<div className="bb-reschedule-overlay" onClick={(event) => { if (event.target === event.currentTarget) controller.close(); }}><section ref={dialogRef} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby="bb-reschedule-title" className="bb-reschedule-dialog">
    <header><div><p className="bb-live-world-eyebrow">Find a time that works</p><h2 id="bb-reschedule-title">{counter ? 'Suggest another time' : 'Reschedule booking'}</h2><p>{controller.booking?.serviceName || 'Choose a new booking time'}</p></div><button aria-label="Close reschedule" disabled={controller.busy} onClick={controller.close}><X size={20} /></button></header>
    {controller.booking && <div className="bb-reschedule-current"><Clock3 size={18} /><div><small>Current booking</small><TimeLabel slot={bookingSlot(controller.booking)} timezone={controller.timezone} /></div></div>}
    <label className="bb-reschedule-field">New date<input type="date" min={controller.today} value={controller.dateKey} onChange={(e) => controller.changeDate(e.target.value)} disabled={controller.busy} /></label>
    <fieldset><legend>Available times <span>{controller.timezone}</span></legend>{controller.loading ? <p role="status">Checking availability…</p> : controller.slots.length ? <div className="bb-reschedule-slots">{controller.slots.map((slot, index) => <button type="button" key={`${slot.time}-${index}`} aria-pressed={selected === String(index)} onClick={() => setSelected(String(index))}>{slot.time}</button>)}</div> : <p className="bb-reschedule-hint">No alternative times available on this date. Try another day. Class bookings can only move to an existing session.</p>}</fieldset>
    <label className="bb-reschedule-field">Note <span>Optional</span><textarea maxLength={500} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Anything the other person should know?" /></label>
    {controller.error && <p className="bb-reschedule-error" role="alert">{controller.error}</p>}
    <footer><p>The original booking stays confirmed until you both agree. No payment changes.</p><button className="bb-primary-btn" disabled={controller.busy || controller.loading || selected === '' || !controller.slots[Number(selected)] || counter && controller.proposal.proposer === controller.actor} onClick={() => controller.respond(counter ? 'counter' : 'propose', controller.slots[Number(selected)], note)}>{controller.busy ? 'Sending…' : counter ? 'Send counteroffer' : 'Propose new time'}</button></footer>
  </section></div>, document.body);
}
