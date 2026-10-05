import { AlertTriangle, CalendarDays, Clock3, MessageCircle } from 'lucide-react';
import { AppSheet } from '../../../shared/ui/AppSheet';
import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { formatMoney, normalizeFinanceStatus } from '../../finance/utils/financeLedger';
import { scheduleBookingThreadId } from '../utils/scheduleReschedules';
import { getScheduleBusinessClock } from '../utils/scheduleAgenda';
import { scheduleDetailsDateLabel, scheduleDetailsDuration, scheduleDetailsPayment, scheduleDetailsTimeLabel, scheduleDetailsWindowLabel } from '../utils/scheduleBookingDetails';

const statusLabels = { pending: 'Pending', confirmed: 'Confirmed', waitlist: 'Waitlisted', cancelled: 'Cancelled', declined: 'Declined', completed: 'Completed', no_show: 'Did not attend' };
const paymentLabels = { paid: 'Paid', pending: 'Awaiting payment confirmation', unpaid: 'Unpaid', refunded: 'Refunded', failed: 'Payment failed' };
const paymentMethods = { cash: 'Cash', manual_eft: 'Manual EFT', stripe: 'Card', card: 'Card', paystack: 'Paystack', paypal: 'PayPal' };

export function ScheduleBookingDetails({ booking, service, staffMember, workspace = {}, proposal, timing,
  rescheduleLoading = false, rescheduleError = '', conflict = null, onClose, onViewRequests, onOpenConversation }) {
  if (!booking) return null;
  const dateKey = booking.dateKey || booking.date;
  const duration = scheduleDetailsDuration(timing ? timing.durationMinutes : booking.durationMinutes);
  const payment = scheduleDetailsPayment(booking, workspace);
  const paymentStatus = normalizeFinanceStatus(booking.paymentStatus);
  const threadId = scheduleBookingThreadId(booking, proposal, workspace.threads);
  const pendingProposal = proposal?.bookingId === booking.id && proposal.status === 'pending' ? proposal : null;
  const staffName = staffMember?.name || booking.staffName || (booking.staffId ? 'Former staff member' : 'Unassigned');
  const timezone = getScheduleBusinessClock(workspace.timezone).timezone;
  const timezoneLabel = timezone === 'UTC' ? 'UTC' : timezone.split('/').at(-1).replace(/_/g, ' ');
  return <AppSheet title={booking.clientName || 'Booking details'} eyebrow="BOOKING DETAILS" onClose={onClose}
    lede={booking.serviceName || service?.name || 'Booking'} panelClassName="bb-schedule-booking-details"
    footer={<div className="bb-schedule-booking-details-actions">
      {threadId && onOpenConversation ? <Button action="chat" variant="secondary" onClick={() => onOpenConversation(threadId)}>{pendingProposal ? 'Review reschedule' : 'Open conversation'}</Button> : null}
      {onViewRequests ? <Button action="view" variant="primary" onClick={() => onViewRequests(booking)}>Manage booking</Button> : null}
    </div>}>
    <div className="bb-schedule-booking-details-status"><StatusBadge status={booking.status || 'pending'} label={statusLabels[booking.status] || booking.status || 'Pending'} /><StatusBadge status={paymentStatus} label={paymentLabels[paymentStatus] || paymentStatus} /></div>
    <div className="bb-schedule-booking-details-when"><CalendarDays size={18} /><strong>{scheduleDetailsDateLabel(dateKey)}</strong><span><Clock3 size={16} />{scheduleDetailsWindowLabel(booking, timing)}</span><small title={timezone}>{timezoneLabel} time</small></div>
    {timing?.attentionReason ? <p className="bb-schedule-booking-details-feed" role="status">{timing.attentionReason}</p> : null}
    {conflict ? <div className="bb-schedule-booking-details-warning" role="status"><AlertTriangle size={18} /><div><strong>{conflict.label || 'Availability needs attention'}</strong><p>This booking is still on your schedule. Review its time or staff assignment before making a change.</p></div></div> : null}
    <dl className="bb-schedule-booking-details-facts">
      <div><dt>Service</dt><dd>{booking.serviceName || service?.name || 'Service not recorded'}{booking.variantName ? <small>{booking.variantName}</small> : null}</dd></div>
      <div><dt>Assigned to</dt><dd>{staffName}</dd></div>
      <div><dt>Duration</dt><dd>{duration != null ? `${duration} minutes` : 'Not recorded'}</dd></div>
      {Number(booking.partySize) > 0 ? <div><dt>Guests</dt><dd>{Number(booking.partySize)}</dd></div> : null}
      <div><dt>Booking total</dt><dd>{payment.quote && payment.total === 0 ? 'Quote required' : payment.total != null ? formatMoney(payment.total, payment.currency) : 'Not recorded'}</dd></div>
      {payment.paid != null ? <div><dt>Amount paid</dt><dd>{formatMoney(payment.paid, payment.currency)}</dd></div> : null}
      <div><dt>Payment method</dt><dd>{paymentMethods[booking.paymentMethod || booking.paymentGateway] || booking.paymentMethod || booking.paymentGateway || 'Not recorded'}</dd></div>
      {booking.clientEmail ? <div><dt>Email</dt><dd>{booking.clientEmail}</dd></div> : null}
      {booking.clientPhone ? <div><dt>Phone</dt><dd>{booking.clientPhone}</dd></div> : null}
    </dl>
    {String(booking.clientNote || '').trim() ? <section className="bb-schedule-booking-details-notes"><h3>Client note</h3><p>{booking.clientNote}</p></section> : null}
    {rescheduleLoading ? <p className="bb-schedule-booking-details-feed" role="status">Checking for reschedule requests…</p> : null}
    {rescheduleError ? <p className="bb-schedule-booking-details-feed is-error" role="alert">{rescheduleError}</p> : null}
    {pendingProposal ? <section className="bb-schedule-booking-details-reschedule"><div><MessageCircle size={18} /><h3>Reschedule requested</h3></div>
      <p>{pendingProposal.proposer === 'client' ? 'Your client suggested a new time.' : 'A new time has been suggested to your client.'} The booking keeps its current time until both sides agree.</p>
      <dl><div><dt>Suggested date</dt><dd>{scheduleDetailsDateLabel(pendingProposal.proposed?.dateKey)}</dd></div><div><dt>Suggested time</dt><dd>{scheduleDetailsTimeLabel(pendingProposal.proposed?.time)}</dd></div></dl>
      {String(pendingProposal.note || '').trim() ? <p className="bb-schedule-booking-details-notes">{pendingProposal.note}</p> : null}
      {!threadId ? <p>The linked conversation is unavailable. Manage the booking from Requests.</p> : null}
    </section> : null}
  </AppSheet>;
}
