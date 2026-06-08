import { useEffect } from 'react';

const funnelRoomFields = {
  introduction: [
    ['input', 'brandName', 'Booking page name', 'Welcome to your business', true],
    ['input', 'tagline', 'Text above heading', 'Private bookings / by appointment'],
    ['textarea', 'welcomeMessage', 'Subtext under heading', 'Choose a time that works for you.'],
    ['input', 'bookingCtaLabel', 'Button text', 'Add booking to cart'],
    ['input', 'dateLabel', 'Date heading', 'Pick your booking date']
  ],
  cart: [
    ['input', 'cartBackLabel', 'Back link', 'Edit selection'],
    ['input', 'cartEyebrow', 'Text above heading', 'Your booking'],
    ['input', 'cartTitle', 'Cart heading', 'Review booking.', true],
    ['textarea', 'cartCopy', 'Cart copy', 'Check your service, date, and time before checkout. You can edit the booking if anything looks off.'],
    ['input', 'cartCtaLabel', 'Button text', 'Complete your details']
  ],
  checkout: [
    ['input', 'checkoutTitle', 'Checkout title', 'Fill in your details.', true],
    ['textarea', 'checkoutCopy', 'Checkout copy', 'Request the booking first. If payment is needed, the next step will take care of it cleanly.'],
    ['input', 'detailsHeading', 'Section label', 'Your Details'],
    ['input', 'detailsSubHeading', 'Form heading', 'Secure Your Slot'],
    ['input', 'checkoutSubmitLabel', 'Button text', 'Request booking']
  ],
  success: [
    ['input', 'successStatusLabel', 'Status label', 'Booking Status'],
    ['input', 'successHeading', 'Success heading', 'Request sent.', true],
    ['textarea', 'successCopy', 'Success copy', 'We have your request and will review the booking details shortly.'],
    ['input', 'successNextTitle', 'Next title', 'Business review'],
    ['textarea', 'successNextCopy', 'Next copy', 'We will confirm the slot, follow up if needed, or help adjust the booking.'],
    ['input', 'successNewRequestLabel', 'Restart link', 'New Request']
  ]
};

const legacyCartText = {
  cartEyebrow: { 'Your cart': 'Your booking' },
  cartTitle: { 'Review cart.': 'Review booking.' },
  cartCopy: {
    'Check your item before checkout. You can edit the booking if anything looks off.': 'Check your service, date, and time before checkout. You can edit the booking if anything looks off.'
  }
};

const getFieldValue = (settings, key) => legacyCartText[key]?.[settings[key]] || settings[key] || '';
const getDefaultTextPatch = (fields) => fields.reduce((patch, [, key, , defaultValue]) => {
  patch[key] = defaultValue;
  return patch;
}, {});

export function FunnelTextRoom({
  onSettingChange,
  page,
  settings
}) {
  const fields = funnelRoomFields[page] || funnelRoomFields.introduction;
  const resetDefaultText = () => {
    const defaults = getDefaultTextPatch(fields);
    Object.entries(defaults).forEach(([key, value]) => onSettingChange(key, value));
  };

  useEffect(() => {
    if (page !== 'cart') return;
    Object.entries(legacyCartText).forEach(([key, replacements]) => {
      const replacement = replacements[settings[key]];
      if (replacement) onSettingChange(key, replacement);
    });
  }, [onSettingChange, page, settings.cartCopy, settings.cartEyebrow, settings.cartTitle]);

  return (
    <div className={`cinema-intro-editor cinema-${page}-room`}>
      <button type="button" className="cinema-reset-default-text" onClick={resetDefaultText}>
        Reset default text
      </button>
      <div className="cinema-intro-fields">
        {fields.map(([type, key, label, placeholder, hero]) => (
          <label key={key} className={`cinema-text-card ${hero ? 'is-hero' : ''} ${type === 'textarea' ? 'cinema-subtext-card' : ''}`}>
            <span>{label}</span>
            {type === 'textarea' ? (
              <textarea rows={1} value={getFieldValue(settings, key)} onChange={(event) => onSettingChange(key, event.target.value)} placeholder={placeholder} />
            ) : (
              <input value={getFieldValue(settings, key)} onChange={(event) => onSettingChange(key, event.target.value)} placeholder={placeholder} />
            )}
          </label>
        ))}
      </div>

    </div>
  );
}
