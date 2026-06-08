import { Briefcase, Calendar, Check, CreditCard, MessageSquare, User, X } from 'lucide-react';
import { getLocalDateStr } from '../../../utils/dates';

export const ManualBookingSheet = ({
  activeStaffProfile,
  displayStaffList,
  manualBookingServiceId,
  onClose,
  onManualBookingServiceIdChange,
  onSubmit,
  selectedManualBookingService,
  workspaceServices
}) => (
  <div className="manual-booking-overlay fixed inset-0 z-[220] bg-black/45 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-6">
    <form onSubmit={onSubmit} className="manual-booking-sheet w-full md:max-w-5xl max-h-[94dvh] overflow-y-auto bg-white rounded-t-[1.6rem] md:rounded-2xl border border-neutral-100 shadow-2xl shadow-black/30">
      <div className="manual-booking-header sticky top-0 z-10 bg-white/92 backdrop-blur-xl border-b border-neutral-100 p-4 md:p-6 flex items-start justify-between gap-4">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Manual Booking</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-black">Add Booking</h2>
          <p className="text-sm text-neutral-500 mt-1">Create an appointment for walk-ins, phone calls, DMs, or staff-entered bookings.</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close manual booking form"
          className="w-10 h-10 rounded-full bg-white border border-neutral-200 text-neutral-500 hover:text-black hover:border-black flex items-center justify-center shrink-0"
        >
          <X size={17} />
        </button>
      </div>

      <div className="manual-booking-body p-4 md:p-6 space-y-4">
        <section className="manual-booking-section">
          <div className="manual-booking-section-head">
            <User size={16} />
            <span>Client</span>
          </div>
          <div className="manual-booking-grid">
            <label className="manual-booking-field md:col-span-2">
              <span>Name</span>
              <input name="clientName" required placeholder="Client name" />
            </label>
            <label className="manual-booking-field">
              <span>Phone</span>
              <input name="clientPhone" type="tel" placeholder="+27 82 000 0000" />
            </label>
            <label className="manual-booking-field">
              <span>Email</span>
              <input name="clientEmail" type="email" placeholder="client@email.com" />
            </label>
            <label className="manual-booking-field">
              <span>Birthday</span>
              <input name="clientBirthday" placeholder="MM/DD or 9 December" />
            </label>
          </div>
        </section>

        <section className="manual-booking-section">
          <div className="manual-booking-section-head">
            <Calendar size={16} />
            <span>Appointment</span>
          </div>
          <div className="manual-booking-grid">
            <label className="manual-booking-field">
              <span>Date</span>
              <input name="bookingDate" type="date" required defaultValue={getLocalDateStr(new Date())} />
            </label>
            <label className="manual-booking-field">
              <span>Time</span>
              <input name="bookingTime" type="time" required defaultValue="09:00" />
            </label>
            <label className="manual-booking-field">
              <span>Status</span>
              <select name="bookingStatus" defaultValue="confirmed">
                <option value="confirmed">Confirmed</option>
                <option value="pending">Needs review</option>
                <option value="waitlist">Waitlist</option>
              </select>
            </label>
            <label className="manual-booking-field">
              <span>Staff</span>
              <select name="staffId" defaultValue={activeStaffProfile?.id || displayStaffList[0]?.id || ''}>
                <option value="">Unassigned</option>
                {displayStaffList.map(staff => <option key={staff.id} value={staff.id}>{staff.name}</option>)}
              </select>
            </label>
          </div>
        </section>

        <section className="manual-booking-section">
          <div className="manual-booking-section-head">
            <Briefcase size={16} />
            <span>Service</span>
          </div>
          <div className="manual-booking-grid">
            <label className="manual-booking-field md:col-span-2">
              <span>Service</span>
              <select name="serviceId" value={manualBookingServiceId} onChange={(event) => onManualBookingServiceIdChange(event.target.value)}>
                {workspaceServices.map(service => <option key={service.id} value={service.id}>{service.name}</option>)}
                <option value="custom">Custom service</option>
              </select>
            </label>
            {!selectedManualBookingService && (
              <label className="manual-booking-field md:col-span-2">
                <span>Custom service name</span>
                <input name="customServiceName" placeholder="Walk-in cut, consultation, private booking..." />
              </label>
            )}
            <label className="manual-booking-field">
              <span>Price</span>
              <input name="servicePrice" inputMode="decimal" placeholder="0" defaultValue={selectedManualBookingService?.price || ''} disabled={Boolean(selectedManualBookingService)} />
            </label>
            <label className="manual-booking-field">
              <span>Duration</span>
              <input name="serviceDuration" inputMode="numeric" placeholder="60" defaultValue={selectedManualBookingService?.duration || ''} disabled={Boolean(selectedManualBookingService)} />
            </label>
            <label className="manual-booking-field md:col-span-2">
              <span>Category</span>
              <input name="serviceCategory" placeholder="Barbering, beauty, consultation..." defaultValue={selectedManualBookingService?.category || ''} disabled={Boolean(selectedManualBookingService)} />
            </label>
          </div>
        </section>

        <section className="manual-booking-section">
          <div className="manual-booking-section-head">
            <CreditCard size={16} />
            <span>Payment</span>
          </div>
          <div className="manual-booking-grid">
            <label className="manual-booking-field">
              <span>Method</span>
              <select name="paymentMethod" defaultValue="">
                <option value="">No payment yet</option>
                <option value="cash">Cash</option>
                <option value="manual_eft">Direct EFT</option>
                <option value="yoco">Yoco</option>
                <option value="stripe">Stripe</option>
                <option value="payfast">PayFast</option>
                <option value="paystack">Paystack</option>
              </select>
            </label>
            <label className="manual-booking-field">
              <span>Payment Status</span>
              <select name="paymentStatus" defaultValue="unpaid">
                <option value="unpaid">Unpaid</option>
                <option value="manual_pending">Pending payment</option>
                <option value="paid">Paid</option>
              </select>
            </label>
            <label className="manual-booking-field md:col-span-2">
              <span>Reference</span>
              <input name="paymentReference" placeholder="Optional invoice, receipt, or EFT reference" />
            </label>
          </div>
        </section>

        <section className="manual-booking-section">
          <div className="manual-booking-section-head">
            <MessageSquare size={16} />
            <span>Notes</span>
          </div>
          <label className="manual-booking-field">
            <span>Internal note</span>
            <textarea name="clientNote" placeholder="Preferences, request source, deposit notes, accessibility needs..." />
          </label>
        </section>
      </div>

      <div className="manual-booking-footer sticky bottom-0 bg-white/94 backdrop-blur-xl border-t border-neutral-100 p-4 md:p-5 flex flex-col sm:flex-row gap-3 sm:justify-end">
        <button type="button" onClick={onClose} className="h-12 px-5 rounded-xl bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-widest hover:border-black transition-colors">
          Cancel
        </button>
        <button type="submit" className="h-12 px-6 rounded-xl bg-black text-white text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 hover:bg-neutral-800 transition-colors shadow-xl shadow-black/10">
          <Check size={15} /> Save Booking
        </button>
      </div>
    </form>
  </div>
);
