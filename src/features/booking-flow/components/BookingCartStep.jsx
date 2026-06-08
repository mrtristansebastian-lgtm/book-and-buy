import { BookingCheckoutSummary } from './BookingCheckoutSummary';
import { getActionButtonStyle } from '../utils/bookingFlowUtils';

export const BookingCartStep = ({
  actionButtonStyle,
  activeDate,
  isPreview,
  isWaitlistMode,
  nativeAccentButtonClass,
  onBack,
  onContinue,
  previewStepMotionClass,
  selectedService,
  selectedStaff,
  selectedTime,
  settings
}) => {
  const cartEyebrow = settings.cartEyebrow === 'Your cart' ? 'Your booking' : (settings.cartEyebrow || 'Your booking');
  const cartTitle = settings.cartTitle === 'Review cart.' ? 'Review booking.' : (settings.cartTitle || 'Review booking.');
  const cartCopy = settings.cartCopy === 'Check your item before checkout. You can edit the booking if anything looks off.'
    ? 'Check your service, date, and time before checkout. You can edit the booking if anything looks off.'
    : (settings.cartCopy || 'Check your service, date, and time before checkout. You can edit the booking if anything looks off.');

  return (
  <div className={`booking-cart-step ${previewStepMotionClass} ${isPreview ? 'booking-flow-preview-shell' : 'booking-flow-public-shell'}`} style={{ backgroundColor: settings.backgroundColor, color: settings.bodyColor }}>
    <div className="booking-cart-container">
      <button
        type="button"
        onClick={onBack}
        className="booking-funnel-back"
      >
        <span aria-hidden="true">&lt;</span> {settings.cartBackLabel || 'Edit selection'}
      </button>
      <div className="booking-cart-grid grid gap-6 lg:grid-cols-[1fr_360px] lg:items-start">
        <section className="booking-cart-hero rounded-3xl border p-5 md:p-7" style={{ backgroundColor: settings.pageSurfaceColor || '#ffffff', borderColor: settings.pageBorderColor || '#0000001A' }}>
          <p className="booking-cart-eyebrow text-[10px] font-black uppercase tracking-[0.34em]" style={{ color: `${settings.bodyColor || '#666666'}8A` }}>{cartEyebrow}</p>
          <h2 className="mt-2 text-4xl font-black tracking-tight md:text-5xl" style={{ color: settings.headingColor }}>{cartTitle}</h2>
          <p className="mt-4 max-w-xl text-sm font-semibold leading-relaxed" style={{ color: settings.bodyColor }}>
            {cartCopy}
          </p>
        </section>
        <div className="booking-cart-actions space-y-3">
          <BookingCheckoutSummary
            activeDate={activeDate}
            isWaitlistMode={isWaitlistMode}
            selectedService={selectedService}
            selectedStaff={selectedStaff}
            selectedTime={selectedTime}
            settings={settings}
            variant="cart"
          />
          <button
            type="button"
            onClick={onContinue}
            className={`booking-funnel-primary ${nativeAccentButtonClass}`}
            style={getActionButtonStyle({ settings, actionButtonStyle })}
          >
            <span>{settings.cartCtaLabel || 'Complete your details'}</span>
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>
      </div>
    </div>
  </div>
  );
};
