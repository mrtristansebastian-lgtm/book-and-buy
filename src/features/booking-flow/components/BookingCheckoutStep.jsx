import { getPaymentOptionDisplay, isHostedPaymentOption } from '../utils/checkoutUtils';
import { getActionButtonStyle } from '../utils/bookingFlowUtils';
import { withColorAlpha } from '../../../utils/theme';

export const BookingCheckoutStep = ({
  actionButtonStyle,
  canSubmitBooking,
  detailsForm,
  emailOptInEnabled,
  formData,
  handleAction,
  inspectClass,
  isPreview,
  isSubmitting,
  isWaitlistMode,
  nativeAccentButtonClass,
  nativeAccentFillClass,
  onBack,
  paymentOptions,
  selectedPaymentOptionId,
  setFormData,
  setSelectedPaymentOptionId,
  settings,
  submitError
}) => (
  <div className={`booking-checkout-step ${isPreview ? 'booking-flow-preview-shell' : 'booking-flow-public-shell'} ${isPreview ? '' : 'animate-in fade-in slide-in-from-bottom-20 duration-700'}`} style={{ backgroundColor: settings.backgroundColor, color: settings.bodyColor }}>
    <div className="booking-checkout-container">
      <main className="booking-checkout-panel" style={{ backgroundColor: settings.pageSurfaceColor || '#ffffff', borderColor: settings.pageBorderColor || '#0000001A' }}>
        <button type="button" onClick={onBack} className="booking-funnel-back">
          <span aria-hidden="true">&lt;</span> {settings.checkoutBackLabel || 'Back to cart'}
        </button>
        <p className="booking-checkout-eyebrow" style={{ color: settings.bodyColor }}>{settings.checkoutEyebrow || 'Checkout'}</p>
        <h2 className="booking-checkout-title" style={{ color: settings.headingColor }}>{settings.checkoutTitle || 'Fill in your details.'}</h2>
        <div className="booking-checkout-copy" style={{ color: settings.bodyColor }}>
          {settings.checkoutCopy || 'Request the booking first. If payment is needed, the next step will take care of it cleanly.'}
        </div>
        <div className="booking-checkout-form">
          {detailsForm}
        </div>

        <div className="booking-checkout-options">
          {emailOptInEnabled && (
            <label className={`booking-checkout-email ${inspectClass}`}>
              <input
                type="checkbox"
                checked={Boolean(formData.emailOptIn)}
                onChange={(event) => setFormData({ ...formData, emailOptIn: event.target.checked })}
                className="sr-only"
              />
              <span
                className={`booking-checkout-email-check ${formData.emailOptIn ? nativeAccentFillClass : ''}`}
                style={{
                  backgroundColor: formData.emailOptIn ? (settings.primaryColor || '#39FF14') : 'transparent',
                  borderColor: formData.emailOptIn ? (settings.primaryColor || '#39FF14') : withColorAlpha(settings.headingColor || '#000000', 21, '#000000'),
                  color: settings.buttonTextColor || '#000000'
                }}
              >
                {formData.emailOptIn && <span className="booking-checkout-email-mark" />}
              </span>
              <span className="min-w-0">
                <span className="booking-checkout-option-title" style={{ color: settings.headingColor }}>
                  Email updates
                </span>
                <span className="booking-checkout-option-copy" style={{ color: settings.bodyColor }}>
                  Booking updates to the email entered above.
                </span>
              </span>
            </label>
          )}

          <section className={`booking-payment-box ${!emailOptInEnabled ? 'is-wide' : ''} ${paymentOptions.length > 0 ? 'has-payment-options' : 'is-payment-empty'}`} style={{ borderColor: settings.pageBorderColor || '#0000001A' }}>
            <span className="booking-payment-icon" aria-hidden="true">
              <span className="booking-payment-icon-symbol">$</span>
            </span>
            <div className="booking-payment-content">
              <div className="booking-payment-head">
                <p>
                  Payment details
                </p>
                {paymentOptions.length > 0 && (
                  <button type="button" onClick={() => setSelectedPaymentOptionId('')}>
                    No payment now
                  </button>
                )}
              </div>
              {paymentOptions.length === 0 ? (
                <div className="booking-payment-empty">
                  No payment is taken now.
                </div>
              ) : (
                <div className="booking-payment-options">
                  {paymentOptions.map((option) => {
                    const display = getPaymentOptionDisplay(option);
                    const active = selectedPaymentOptionId === option.id;
                    return (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedPaymentOptionId(active ? '' : option.id)}
                        className={`booking-payment-option ${active ? 'is-active' : ''}`}
                      >
                        <span className="booking-payment-option-row">
                          <span className="booking-payment-option-icon">
                            {option.id === 'manual_eft' ? 'EFT' : option.id === 'cash' ? 'Cash' : 'Pay'}
                          </span>
                          <span className="booking-payment-option-copy">
                            <span className="booking-payment-option-label">{display.label}</span>
                            <span className="booking-payment-option-meta">
                              {isHostedPaymentOption(option) ? 'Secure payment next' : display.eyebrow}
                            </span>
                            <span className="booking-payment-option-description">{display.copy}</span>
                          </span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        </div>

        <div className="booking-checkout-submit-block">
          {submitError && <p className="booking-checkout-error">{submitError}</p>}
          <button
            type="button"
            onClick={handleAction}
            disabled={(isSubmitting || !canSubmitBooking) && !isPreview}
            className={`booking-funnel-primary ${nativeAccentButtonClass} ${(isSubmitting || !canSubmitBooking) && !isPreview ? 'is-disabled' : ''}`}
            style={getActionButtonStyle({ settings, actionButtonStyle })}
          >
            <span>{isSubmitting ? (settings.checkoutSendingLabel || 'Sending request') : isWaitlistMode ? (settings.checkoutWaitlistLabel || 'Join waitlist') : (settings.checkoutSubmitLabel || 'Request booking')}</span>
            <span aria-hidden="true">&gt;</span>
          </button>
        </div>
      </main>
    </div>
  </div>
);
