import { AlertTriangle, ArrowRight, CalendarDays, Clock3, UserRound } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { StatusBadge } from '../../../shared/ui/StatusBadge';
import { formatDisplayDate } from '../../../utils/dates';
import { staffInitials, staffPhoto } from '../pages/schedulePageUtils';

const STATUS_LABELS = { confirmed: 'Confirmed', pending: 'Pending', waitlist: 'Waitlist' };
const PAYMENT_LABELS = { paid: 'Paid', pending: 'Payment pending', manual_pending: 'Payment pending', refunded: 'Refunded', failed: 'Payment failed', canceled: 'Payment cancelled', cancelled: 'Payment cancelled', processing: 'Payment processing' };

function durationLabel(minutes) {
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const remaining = minutes % 60;
  return hours >= 24 ? `${Math.floor(hours / 24)} day${hours >= 48 ? 's' : ''}${hours % 24 ? ` ${hours % 24} hr` : ''}` : `${hours} hr${remaining ? ` ${remaining} min` : ''}`;
}

export function ScheduleBookingRow({ row, conflict, hasReschedule = false, isNext = false, onView }) {
  const { booking, staff, serviceName, clientName, staffName, phase } = row;
  const photo = staffPhoto(staff || {});
  const endLabel = row.endValid && row.endTime ? row.endTime : '';
  return <article className={`bb-agenda-booking${isNext ? ' is-next' : ''}${phase === 'past' ? ' is-past' : ''}`}>
    <div className="bb-agenda-time"><time>{row.startValid ? row.time : 'Time to confirm'}</time>
      {endLabel ? <span>{row.endDateKey !== row.dateKey ? `${formatDisplayDate(row.endDateKey)} · ` : 'Until '}{endLabel}</span> : null}
      {phase === 'in-progress' ? <span className="bb-agenda-now">In progress</span> : phase === 'past' ? <span>Earlier</span> : null}
    </div>
    <span className="bb-agenda-dot" aria-hidden="true" />
    <div className="bb-agenda-booking-main">
      <div className="bb-agenda-booking-title"><h3>{serviceName || 'Booking'}</h3>{isNext ? <span className="bb-agenda-next-tag">Next up</span> : null}</div>
      <p className="bb-agenda-client"><UserRound size={13} aria-hidden="true" />{clientName || 'Client'}</p>
      <div className="bb-agenda-booking-meta"><span className="bb-agenda-staff"><span className="bb-agenda-avatar" aria-hidden="true">{photo ? <img src={photo} alt="" /> : staffInitials(staffName)}</span>{staffName || 'Unassigned'}</span>
        {row.kind === 'class_session' || row.kind === 'class' ? <span><CalendarDays size={13} aria-hidden="true" />Class booking</span> : null}
        {row.durationMinutes > 0 ? <span><Clock3 size={13} aria-hidden="true" />{durationLabel(row.durationMinutes)}</span> : null}
      </div>
      {row.carryover ? <p className="bb-agenda-started">Started {formatDisplayDate(row.dateKey)} at {row.time}</p> : null}
      {conflict || row.attentionReason ? <p className="bb-agenda-warning"><AlertTriangle size={13} aria-hidden="true" />{conflict?.label || row.attentionReason}</p> : null}
    </div>
    <div className="bb-agenda-booking-actions"><div className="bb-agenda-badges"><StatusBadge status={booking.status} label={STATUS_LABELS[booking.status] || booking.status} />
      {hasReschedule ? <StatusBadge status="reschedule-requested" label="Reschedule requested" /> : null}
      {PAYMENT_LABELS[booking.paymentStatus] ? <span className="bb-agenda-payment">{PAYMENT_LABELS[booking.paymentStatus]}</span> : null}
    </div><Button action="view" icon={ArrowRight} variant="secondary" className="bb-agenda-view" onClick={() => onView?.(row)} aria-label={`View booking for ${clientName || 'client'}`}>Details</Button></div>
  </article>;
}
