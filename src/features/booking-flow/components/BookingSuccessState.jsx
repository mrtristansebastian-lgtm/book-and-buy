import { ClientPortalPrompt } from './ClientPortalPrompt';
import { getPaymentOptionDisplay, isHostedPaymentOption } from '../utils/checkoutUtils';
import { withColorAlpha } from '../../../utils/theme';

export const BookingSuccessState = ({
    activeDate,
    formData,
    headingLetterSpacing,
    inspectClass,
    isPreview,
    isWaitlistMode,
    onInspect,
    onInstallApp,
    previewInspectEnabled,
    previewSuccessMotionClass,
    selectedManualPaymentOption,
    selectedTime,
    settings,
    submittedBooking,
    subtextLetterSpacing
}) => {
    const paymentDisplay = selectedManualPaymentOption ? getPaymentOptionDisplay(selectedManualPaymentOption) : null;
    const isHostedPayment = selectedManualPaymentOption ? isHostedPaymentOption(selectedManualPaymentOption) : false;
    const paymentReference = submittedBooking?.paymentReference || submittedBooking?.bookingId || 'Use your booking ID';
    const savedSuccessHeading = String(settings.successHeading || '').trim();
    const successHeading = savedSuccessHeading && savedSuccessHeading !== 'Booking Confirmed!'
        ? savedSuccessHeading
        : 'Request sent.';
    const savedSuccessCopy = String(settings.successCopy || '').trim();
    const successCopy = savedSuccessCopy && savedSuccessCopy !== 'Your request is saved for the business to review.'
        ? savedSuccessCopy
        : 'We have your request and will review the booking details shortly.';
    const savedSuccessNextCopy = String(settings.successNextCopy || '').trim();
    const successNextCopy = savedSuccessNextCopy && savedSuccessNextCopy !== 'They can confirm, follow up, or help adjust the booking.'
        ? savedSuccessNextCopy
        : 'We will confirm the slot, follow up if needed, or help adjust the booking.';

    return (
    <div className={`booking-success-step min-h-full flex items-center justify-center ${previewSuccessMotionClass} p-4 md:p-10 relative z-10`} style={{ backgroundColor: settings.backgroundColor, color: settings.bodyColor }}>
        <main className="booking-success-panel flex w-full max-w-3xl flex-col items-center rounded-3xl border p-5 text-center md:p-7" style={{ backgroundColor: settings.pageSurfaceColor || '#ffffff', borderColor: settings.pageBorderColor || withColorAlpha(settings.headingColor || '#000000', 7, '#000000') }}>
            <div className={`booking-success-hero flex w-full max-w-xl flex-col items-center gap-4 text-center ${inspectClass}`} onClick={() => previewInspectEnabled && onInspect('buttons')}>
                <div className="min-w-0">
                    <p className="booking-success-kicker text-[10px] font-black uppercase tracking-[0.34em] opacity-35" style={{ color: settings.bodyColor }}>{settings.successStatusLabel || 'Booking Status'}</p>
                    <h2 className="booking-success-title mt-2 text-4xl md:text-5xl font-black tracking-tight leading-none" style={{ color: settings.headingColor, ...(headingLetterSpacing ? { letterSpacing: headingLetterSpacing } : {}) }}>
                        {isWaitlistMode ? "You're on the list." : successHeading}
                    </h2>
                    <p className="booking-success-copy mx-auto mt-3 max-w-xl text-sm md:text-base font-semibold leading-relaxed opacity-55" style={{ color: settings.bodyColor, ...(subtextLetterSpacing ? { letterSpacing: subtextLetterSpacing } : {}) }}>
                        {isWaitlistMode ? `You are on the standby list for ${activeDate.month} ${activeDate.dayNum}. We will contact you if a slot opens.` : successCopy}
                    </p>
                </div>
            </div>

            <div className="booking-success-details mt-6 grid w-full gap-3 md:grid-cols-[1fr_1fr]">
                <div className="booking-success-detail rounded-2xl border p-4" style={{ borderColor: withColorAlpha(settings.headingColor || '#000000', 6, '#000000'), backgroundColor: withColorAlpha(settings.headingColor || '#000000', 2, '#000000') }}>
                    <p className="booking-success-detail-label flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: settings.headingColor }}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {settings.successReferenceLabel || 'Reference'}
                    </p>
                    <p className="mt-2 text-xl font-black tracking-tight" style={{ color: settings.headingColor }}>{paymentReference}</p>
                    <p className="mt-1 text-xs font-semibold opacity-50" style={{ color: settings.bodyColor }}>{settings.successReferenceCopy || 'Keep this for updates with the business.'}</p>
                </div>
                <div className="booking-success-detail rounded-2xl border p-4" style={{ borderColor: withColorAlpha(settings.headingColor || '#000000', 6, '#000000'), backgroundColor: withColorAlpha(settings.headingColor || '#000000', 2, '#000000') }}>
                    <p className="booking-success-detail-label flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.24em]" style={{ color: settings.headingColor }}>
                        <span className="h-1.5 w-1.5 rounded-full bg-current" /> {settings.successNextLabel || 'Next'}
                    </p>
                    <p className="mt-2 text-sm font-black" style={{ color: settings.headingColor }}>{isWaitlistMode ? 'Waitlist review' : (settings.successNextTitle || 'Business review')}</p>
                    <p className="mt-1 text-xs font-semibold leading-relaxed opacity-50" style={{ color: settings.bodyColor }}>{successNextCopy}</p>
                </div>
            </div>

            {paymentDisplay && (
                <div className="booking-success-payment mt-3 rounded-2xl border p-4" style={{ borderColor: withColorAlpha(settings.primaryColor || settings.headingColor || '#000000', 14, '#000000'), backgroundColor: withColorAlpha(settings.primaryColor || settings.headingColor || '#000000', 3, '#000000') }}>
                    <p className="text-[10px] font-extrabold uppercase tracking-[0.28em]" style={{ color: settings.headingColor }}>{paymentDisplay.label}</p>
                    <p className="mt-1 text-xs md:text-sm leading-relaxed opacity-60" style={{ color: settings.bodyColor }}>
                        {isHostedPayment
                            ? 'Your secure payment can be completed from the payment step. The business will see the payment status once it updates.'
                            : paymentDisplay.copy}
                    </p>
                </div>
            )}

            <div className="booking-success-portal mt-4">
                <ClientPortalPrompt formData={formData} isPreview={isPreview} onInstallApp={onInstallApp} settings={settings} />
            </div>
        </main>
    </div>
    );
};
