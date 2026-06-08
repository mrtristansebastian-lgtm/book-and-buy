import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import { withColorAlpha } from '../../../utils/theme';
import { getPaymentOptionDisplay } from '../utils/checkoutUtils';

const SummaryRow = ({ label, meta, value, settings }) => (
  <div className="booking-summary-row flex items-start gap-3 rounded-xl border px-3 py-3" style={{ backgroundColor: withColorAlpha(settings.headingColor || '#000000', 2, '#000000'), borderColor: settings.pageBorderColor || withColorAlpha(settings.headingColor || '#000000', 5, '#000000') }}>
    <span className="booking-summary-icon mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[10px] font-black shadow-sm shadow-black/5" style={{ backgroundColor: settings.pageSurfaceColor || '#ffffff', color: settings.headingColor }}>
      {label.slice(0, 1)}
    </span>
    <span className="booking-summary-copy min-w-0">
      <span className="booking-summary-label block text-[9px] font-black uppercase tracking-[0.24em]" style={{ color: withColorAlpha(settings.bodyColor || '#666666', 50, '#666666') }}>{label}</span>
      <span className="booking-summary-value mt-0.5 block text-sm font-black leading-tight" style={{ color: settings.headingColor }}>{value || 'Not selected'}</span>
      {meta && <span className="booking-summary-meta mt-1 block text-[11px] font-bold leading-tight" style={{ color: settings.bodyColor }}>{meta}</span>}
    </span>
  </div>
);

export const BookingCheckoutSummary = ({
  activeDate,
  isWaitlistMode,
  selectedPaymentOption,
  selectedService,
  selectedStaff,
  selectedTime,
  variant = 'checkout',
  settings
}) => {
  const isCartSummary = variant === 'cart';
  const price = formatServicePrice(selectedService || {});
  const duration = formatServiceDuration(selectedService?.duration);
  const itemMeta = isCartSummary ? [duration, price].filter(Boolean).join(' / ') : '';
  const payment = selectedPaymentOption ? getPaymentOptionDisplay(selectedPaymentOption) : null;
  const dateText = activeDate ? `${activeDate.dayName}, ${activeDate.month} ${activeDate.dayNum}` : '';
  const timeText = isWaitlistMode ? 'Join waitlist' : selectedTime;

  return (
    <aside className={`booking-checkout-summary ${isCartSummary ? 'booking-cart-summary' : ''} rounded-2xl border p-4 md:p-5`} style={{ backgroundColor: settings.pageSurfaceColor || '#ffffff', borderColor: settings.pageBorderColor || '#0000001A' }}>
      <div className="booking-summary-head mb-4 flex items-start justify-between gap-4">
        <div className="booking-summary-title">
          <p className="text-[9px] font-black uppercase tracking-[0.32em]" style={{ color: withColorAlpha(settings.bodyColor || '#666666', 50, '#666666') }}>{isCartSummary ? 'Booking summary' : 'Checkout summary'}</p>
          {!isCartSummary && <h3 className="mt-1 text-2xl font-black tracking-tight" style={{ color: settings.headingColor }}>{selectedService?.name || settings.brandName || 'Booking'}</h3>}
          {!isCartSummary && (duration || price) && (
            <p className="mt-1 text-xs font-bold" style={{ color: settings.bodyColor }}>{[duration, price].filter(Boolean).join(' / ')}</p>
          )}
        </div>
        {!isCartSummary && (
          <span className="booking-summary-count rounded-full px-3 py-1.5 text-[9px] font-black uppercase tracking-widest" style={{ backgroundColor: settings.primaryColor || settings.headingColor, color: settings.buttonTextColor || '#ffffff' }}>1 service</span>
        )}
      </div>
      <div className="booking-summary-rows grid gap-2">
        <SummaryRow label="Service" value={selectedService?.name || 'Selected booking'} meta={itemMeta} settings={settings} />
        {selectedStaff?.name && <SummaryRow label="Staff" value={selectedStaff.name} settings={settings} />}
        <SummaryRow label="Date" value={dateText} settings={settings} />
        <SummaryRow label="Time" value={timeText} settings={settings} />
        {payment && <SummaryRow label="Payment" value={payment.label} settings={settings} />}
      </div>
      <div className="booking-summary-total mt-4 flex items-center justify-between border-t pt-4" style={{ borderColor: settings.pageBorderColor || '#0000001A' }}>
        <span className="text-[10px] font-black uppercase tracking-[0.28em]" style={{ color: withColorAlpha(settings.bodyColor || '#666666', 50, '#666666') }}>Total</span>
        <span className="text-xl font-black tracking-tight" style={{ color: settings.headingColor }}>{price || 'Confirmed after review'}</span>
      </div>
    </aside>
  );
};
