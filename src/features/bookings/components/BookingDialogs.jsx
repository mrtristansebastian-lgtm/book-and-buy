import { useState } from 'react';
import { CalendarDays, Clock3, RefreshCw, Trash2, X } from 'lucide-react';
import { createRescheduleProposal } from '../../communications/communicationsModel';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { getLocalDateStr } from '../../../utils/dates';

export const BookingInfoDialog = ({
  booking,
  staffList = [],
  getBookingService,
  onClose,
  onRequestDelete,
  onRequestReschedule
}) => {
  const [rescheduleOpen, setRescheduleOpen] = useState(false);
  const [rescheduleDraft, setRescheduleDraft] = useState({ date: '', time: '' });
  const [sendingReschedule, setSendingReschedule] = useState(false);
  if (!booking) return null;

  const serviceDetails = getBookingService?.(booking);
  const assignedStaff = staffList.find(staff => staff.id === booking.staffId);
  const serviceName = serviceDetails?.name || booking.serviceName || 'Not set';
  const serviceDuration = formatServiceDuration(serviceDetails?.duration || booking.duration);
  const servicePrice = formatServicePrice(serviceDetails || booking);
  const paymentStatus = booking.paymentStatus === 'paid'
    ? 'Paid'
    : booking.paymentStatus === 'manual_pending'
      ? 'Pending manual payment'
      : booking.paymentStatus || 'Not marked';
  const details = [
    { label: 'Client', value: booking.clientName || 'Client' },
    { label: 'Status', value: booking.status === 'waitlist' ? 'Standby' : booking.status || 'Pending' },
    { label: 'Phone', value: booking.clientPhone || 'Not collected' },
    { label: 'Email', value: booking.clientEmail || 'Not collected' },
    { label: 'Country', value: booking.clientCountry || 'Not collected' },
    { label: 'Birthday', value: booking.clientBirthday || 'Not collected' },
    { label: 'Service', value: [serviceName, serviceDuration, servicePrice].filter(Boolean).join(' / ') },
    { label: 'Date', value: booking.date || booking.dateKey || 'Not set' },
    { label: 'Time', value: booking.time || 'Not set' },
    { label: 'Staff', value: assignedStaff?.name || 'Unassigned' },
    { label: 'Payment', value: paymentStatus },
    { label: 'Method', value: booking.paymentMethod || booking.paymentGateway || 'Not selected' },
    { label: 'Note', value: booking.clientNote || 'No note saved' }
  ];
  const canSendReschedule = rescheduleDraft.date.trim() && rescheduleDraft.time.trim() && !sendingReschedule;
  const submitReschedule = async () => {
    if (!canSendReschedule) return;
    setSendingReschedule(true);
    try {
      const proposal = createRescheduleProposal({
        bookingId: booking.id,
        date: rescheduleDraft.date.trim(),
        time: rescheduleDraft.time.trim(),
        requestedBy: 'owner',
        source: 'offer',
        message: `Reschedule request from the business: ${rescheduleDraft.date.trim()} at ${rescheduleDraft.time.trim()}. Confirm this time or send a counter offer.`
      });
      await onRequestReschedule?.(booking, proposal);
    } finally {
      setSendingReschedule(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="booking-info-title"
        data-testid="booking-info-dialog"
        className="booking-info-modal w-full sm:max-w-lg bg-white rounded-t-[1.5rem] sm:rounded-lg border border-neutral-100 shadow-2xl p-5 md:p-7 animate-in fade-in zoom-in-95 duration-300 max-h-[calc(100dvh-1rem)] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="booking-info-eyebrow text-[10px] font-bold uppercase tracking-[0.2em] text-neutral-400 mb-2">Booking Info</p>
            <h2 id="booking-info-title" className="text-2xl font-bold tracking-tight text-black">{booking.clientName || 'Client'}</h2>
            <p className="booking-info-description mt-2 text-sm leading-relaxed text-neutral-500">Full booking, client, staff, and payment context.</p>
          </div>
          <button type="button" aria-label="Close booking info" data-testid="booking-info-close" onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="booking-info-grid">
          {details.map(item => (
            <div key={item.label} className={`booking-info-field ${item.label === 'Note' ? 'is-wide' : ''}`}>
              <span>{item.label}</span>
              <strong>{item.value}</strong>
            </div>
          ))}
        </div>
        <button type="button" data-testid="booking-info-reschedule" onClick={() => setRescheduleOpen(true)} className="booking-info-reschedule-button mt-4">
          <RefreshCw size={14} /> Reschedule Booking
        </button>
        <button type="button" data-testid="booking-info-delete" onClick={() => onRequestDelete?.(booking)} className="booking-info-danger-button mt-4">
          <Trash2 size={14} /> Remove Booking
        </button>
      </div>
      {rescheduleOpen ? (
        <div className="booking-reschedule-overlay" role="presentation">
          <section className="booking-reschedule-wizard" role="dialog" aria-modal="true" aria-label="Reschedule booking">
            <div className="booking-reschedule-wizard-head">
              <span className="booking-reschedule-wizard-icon native-gradient-icon" aria-hidden="true">
                <RefreshCw size={16} />
              </span>
              <div>
                <p>Reschedule request</p>
                <h3>What time would you like to reschedule to?</h3>
                <span>A request will be sent to the client. They can confirm this time or send a counter offer from their end.</span>
              </div>
              <button type="button" aria-label="Close reschedule wizard" onClick={() => setRescheduleOpen(false)}>
                <X size={15} />
              </button>
            </div>
            <div className="booking-reschedule-fields">
              <label>
                <span><CalendarDays size={13} /> New date</span>
                <input
                  type="date"
                  min={getLocalDateStr(new Date())}
                  value={rescheduleDraft.date}
                  onChange={(event) => setRescheduleDraft(prev => ({ ...prev, date: event.target.value }))}
                />
              </label>
              <label>
                <span><Clock3 size={13} /> New time</span>
                <input
                  type="time"
                  value={rescheduleDraft.time}
                  onChange={(event) => setRescheduleDraft(prev => ({ ...prev, time: event.target.value }))}
                />
              </label>
            </div>
            <div className="booking-reschedule-actions">
              <button type="button" onClick={() => setRescheduleOpen(false)}>Back</button>
              <button type="button" className="native-gradient-button" disabled={!canSendReschedule} onClick={submitReschedule}>
                {sendingReschedule ? 'Sending' : 'Send Request'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
};

export const RunningLateDialog = ({ dialog, onClose, onChange, onSubmit }) => {
  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="running-late-title"
        data-testid="running-late-dialog"
        className="w-full sm:max-w-lg bg-white rounded-t-[1.5rem] sm:rounded-lg border border-neutral-100 shadow-2xl p-6 md:p-7 animate-in fade-in zoom-in-95 duration-300 max-h-[calc(100dvh-1rem)] overflow-y-auto"
      >
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-3">Running Late</p>
            <h2 id="running-late-title" className="text-2xl font-bold tracking-tight text-black">Update {dialog.booking?.clientName || 'client'}</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">Send a clean in-app notification and email using your saved communication settings.</p>
          </div>
          <button type="button" aria-label="Close late update" data-testid="running-late-close" onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black transition-colors">
            <X size={16} />
          </button>
        </div>
        <label className="block mb-4">
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">Minutes Late</span>
          <input
            type="number"
            min="1"
            value={dialog.minutes}
            data-testid="running-late-minutes"
            onChange={(event) => {
              const minutes = event.target.value;
              onChange(prev => ({
                ...prev,
                minutes,
                message: prev.message?.startsWith('Running ') ? `Running ${minutes || '15'} minutes late. Thanks for your patience - we will keep you posted here.` : prev.message
              }));
            }}
            className="w-full h-12 rounded-lg bg-neutral-50 border border-neutral-100 px-4 text-sm font-bold text-black outline-none focus:bg-white focus:border-black transition-colors"
          />
        </label>
        <label className="block mb-6">
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">Message</span>
          <textarea
            rows={4}
            value={dialog.message}
            data-testid="running-late-message"
            onChange={(event) => onChange(prev => ({ ...prev, message: event.target.value }))}
            className="w-full resize-none rounded-lg bg-neutral-50 border border-neutral-100 px-4 py-3 text-sm leading-relaxed text-black outline-none focus:bg-white focus:border-black transition-colors"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" data-testid="running-late-cancel" onClick={onClose} className="h-12 rounded-full bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-[0.12em] hover:border-black transition-colors">
            Cancel
          </button>
          <button type="button" data-testid="running-late-submit" onClick={onSubmit} className="h-12 rounded-full native-gradient-button text-black text-[10px] font-bold uppercase tracking-[0.12em]">
            Send Update
          </button>
        </div>
      </div>
    </div>
  );
};
