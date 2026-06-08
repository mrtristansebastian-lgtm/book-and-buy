import {
  Briefcase,
  Calendar,
  Check,
  DollarSign,
  Hourglass,
  Info,
  Mail,
  MessagesSquare,
  X
} from 'lucide-react';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';

const RunningPersonIcon = ({ size = 14, strokeWidth = 2.6, ...props }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={strokeWidth}
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
    {...props}
  >
    <circle cx="14" cy="4.5" r="2" />
    <path d="m11.8 8.2 4.2 2.2 2.3-2.2" />
    <path d="m13.3 10.1-2.6 3.7 3.6 2.2 1.9 3.8" />
    <path d="m10.6 13.8-3.2 1.1-2 3" />
    <path d="M7 7.8h4.4" />
  </svg>
);

export const BookingRecordRow = ({
  approveBooking,
  booking,
  displayStaffList,
  getBookingClientAvatar,
  getBookingService,
  markBookingPaid,
  onSetBookingInfo,
  openBookingChat,
  safeStaffList,
  sendReviewToBooking,
  sendRunningLateToBooking,
  sendWaitlistToBooking,
  setConfirmDialog,
  updateBooking
}) => {
  const assignedStaff = safeStaffList.find(staff => staff.id === booking.staffId);
  const isExampleBooking = Boolean(booking.isExample);
  const clientAvatar = getBookingClientAvatar(booking);
  const serviceDetails = getBookingService(booking);
  const serviceSummary = serviceDetails?.name
    ? [serviceDetails.name, formatServiceDuration(serviceDetails.duration), formatServicePrice(serviceDetails)].filter(Boolean).join(' / ')
    : '';
  const statusStyle = booking.status === 'confirmed'
    ? 'bg-[#39FF14] text-black'
    : booking.status === 'waitlist'
      ? 'bg-amber-100 text-amber-800'
      : booking.status === 'declined'
        ? 'bg-red-50 text-red-600'
        : 'bg-black text-white';
  const hasManualPayment = Boolean(booking.paymentMethod || booking.paymentGateway || booking.paymentStatus === 'manual_pending');
  const isPaid = booking.paymentStatus === 'paid';
  const isConfirmed = booking.status === 'confirmed';

  return (
    <div className={`booking-record-row p-4 md:p-5 ${booking.status === 'declined' ? 'opacity-50 grayscale' : ''}`}>
      <div className="booking-record-grid grid grid-cols-1 2xl:grid-cols-12 gap-4 2xl:items-center">
        <div className="booking-record-client 2xl:col-span-5 flex items-center gap-4 min-w-0">
          <div className="booking-record-avatar-wrap relative shrink-0">
            <div className={`w-14 h-14 rounded-lg flex items-center justify-center font-bold text-xl uppercase overflow-hidden ${clientAvatar ? 'bg-neutral-100 text-black' : 'booking-avatar-placeholder'}`}>
              {clientAvatar ? <img src={clientAvatar} alt="" className="w-full h-full object-cover" /> : booking.clientName.charAt(0)}
            </div>
            {booking.noShowHistory && <div className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm" title="No-show history" />}
          </div>
          <div className="min-w-0">
            <div className="booking-record-client-head flex items-center gap-3 mb-1">
              <h3 className="text-lg md:text-xl font-bold tracking-tight text-black truncate">{booking.clientName}</h3>
              {isExampleBooking && <span className="shrink-0 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest bg-neutral-100 text-neutral-500">Example Only</span>}
              <span className={`booking-record-status shrink-0 px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest ${statusStyle}`}>{booking.status === 'waitlist' ? 'Standby' : booking.status}</span>
              <button
                type="button"
                onClick={() => onSetBookingInfo(booking)}
                className="booking-record-info-button"
                aria-label={`View booking information for ${booking.clientName}`}
              >
                <Info size={13} />
                <span>Info</span>
              </button>
            </div>
            {serviceSummary && (
              <p className="booking-record-service mt-2 inline-flex max-w-full items-center gap-2 rounded-full bg-neutral-50 border border-neutral-100 px-3 py-1 text-[10px] font-black uppercase tracking-[0.14em] text-neutral-500">
                <Briefcase size={12} className="shrink-0" />
                <span className="truncate">{serviceSummary}</span>
              </p>
            )}
          </div>
        </div>

        <div className="booking-record-time 2xl:col-span-2">
          <p className="metric-value text-2xl font-bold tracking-tight text-black">{booking.time}</p>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400">{booking.date}</p>
        </div>

        <div className="booking-record-staff 2xl:col-span-3">
          {isExampleBooking ? (
            <div className="inline-flex h-10 items-center px-3 rounded-lg bg-neutral-50 border border-neutral-100 text-[10px] font-bold uppercase tracking-widest text-neutral-400">
              Example preview
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-[9px] font-bold uppercase tracking-widest text-neutral-300 hidden md:inline">Assigned</span>
              <select
                aria-label={`Assign staff for ${booking.clientName}`}
                value={booking.staffId || ''}
                onChange={(event) => updateBooking(booking.id, { staffId: event.target.value })}
                className="h-10 min-w-[160px] bg-white text-sm font-bold px-3 rounded-lg outline-none border border-neutral-200 focus:border-black transition-colors"
              >
                <option value="" disabled>Assign staff</option>
                {displayStaffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
              </select>
              {assignedStaff && <div className="w-3 h-3 rounded-full shadow-sm" style={{ backgroundColor: assignedStaff.color }} />}
            </div>
          )}
        </div>

        <div className="booking-record-actions 2xl:col-span-2 flex flex-wrap items-center justify-start 2xl:justify-end gap-2">
          {isExampleBooking ? (
            <div className="flex flex-wrap items-center justify-start xl:justify-end gap-2">
              <button type="button" disabled className="h-10 px-3 rounded-lg bg-white border border-neutral-200 text-neutral-500 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest cursor-default">
                <Calendar size={14} /> Reschedule
              </button>
              <button type="button" disabled className="h-10 px-3 rounded-lg bg-white border border-neutral-200 text-neutral-500 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest cursor-default">
                <MessagesSquare size={14} /> Chat
              </button>
              <button type="button" disabled className="h-10 px-3 rounded-lg bg-white border border-neutral-200 text-amber-700 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest cursor-default">
                <Hourglass size={14} /> Waitlist
              </button>
              <button type="button" disabled className="h-10 px-3 rounded-lg native-gradient-button flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest cursor-default">
                <Check size={15} strokeWidth={3} /> Approve
              </button>
              <button type="button" disabled className="h-10 px-3 rounded-lg bg-white border border-red-100 text-red-500 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest cursor-default">
                <X size={14} strokeWidth={3} /> Deny
              </button>
            </div>
          ) : (
            <>
              <button
                onClick={() => openBookingChat(booking)}
                aria-label={`Open chat for ${booking.clientName}`}
                className="h-10 px-3 rounded-lg bg-white border border-neutral-200 text-neutral-600 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-50 hover:text-black hover:border-black transition-all"
              >
                <MessagesSquare size={14} /> Chat
              </button>
              <button
                onClick={() => sendRunningLateToBooking(booking)}
                aria-label={`Send running late update to ${booking.clientName}`}
                title="Running late"
                className="h-10 px-3 rounded-lg bg-white border border-neutral-200 text-neutral-600 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-50 hover:text-black hover:border-neutral-300 transition-all"
              >
                <RunningPersonIcon size={14} /> Late
              </button>
              {hasManualPayment && (
                <button
                  type="button"
                  onClick={() => {
                    if (isPaid) return;
                    setConfirmDialog({
                      eyebrow: 'Payment',
                      title: 'Mark this booking as paid?',
                      body: 'This will move the manual payment from pending into paid revenue.',
                      actionLabel: 'Yes',
                      onConfirm: () => markBookingPaid(booking)
                    });
                  }}
                  aria-label={isPaid ? `${booking.clientName} payment is paid` : `Mark ${booking.clientName} booking as paid`}
                  aria-disabled={isPaid}
                  className={`booking-payment-button h-10 px-3 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${isPaid ? 'is-paid cursor-default' : 'is-unpaid bg-white text-neutral-700 border border-neutral-200 hover:bg-white hover:text-black hover:border-neutral-300 hover:-translate-y-0.5'}`}
                >
                  <DollarSign size={14} strokeWidth={2.8} /> {isPaid ? 'Paid' : 'Mark Paid'}
                </button>
              )}
              <button
                onClick={() => sendReviewToBooking(booking)}
                aria-label={`Send review request to ${booking.clientName}`}
                className="h-10 px-3 rounded-lg bg-white border border-neutral-200 text-neutral-600 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-50 hover:text-black transition-all"
              >
                <Mail size={14} /> Review
              </button>
              <button
                onClick={() => {
                  if (isConfirmed) return;
                  sendWaitlistToBooking(booking);
                }}
                aria-label={booking.status === 'waitlist' ? `Notify ${booking.clientName} from waitlist` : `Move ${booking.clientName} to waitlist`}
                aria-disabled={isConfirmed}
                disabled={isConfirmed}
                title={booking.status === 'waitlist' ? 'Notify waitlist' : isConfirmed ? 'Already confirmed' : 'Move to waitlist'}
                className={`booking-waitlist-button h-10 px-3 rounded-lg flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest transition-all ${booking.status === 'waitlist' ? 'is-waitlist bg-amber-100 text-amber-800 hover:bg-amber-200' : isConfirmed ? 'is-disabled bg-white border border-neutral-200 text-neutral-300 cursor-default' : 'bg-white border border-neutral-200 text-neutral-600 hover:bg-amber-50 hover:text-amber-700'}`}
              >
                <Hourglass size={14} /> {booking.status === 'waitlist' ? 'Notify' : 'Waitlist'}
              </button>
              {(booking.status === 'pending' || booking.status === 'waitlist') && (
                <>
                  <button onClick={() => approveBooking(booking)} aria-label={`Approve booking for ${booking.clientName}`} className="h-10 px-3 rounded-lg bg-[#39FF14] text-black flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:brightness-95 transition-all">
                    <Check size={15} strokeWidth={3} /> Approve
                  </button>
                  <button type="button" aria-label={`Deny booking for ${booking.clientName}`} onClick={() => updateBooking(booking.id, { status: 'declined' })} className="h-10 w-10 rounded-lg bg-white border border-neutral-200 flex items-center justify-center text-red-500 hover:bg-red-50 transition-all">
                    <X size={16} strokeWidth={3} />
                  </button>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
