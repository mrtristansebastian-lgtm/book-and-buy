export const emailMessageKeys = ['bookingReceived', 'confirmed', 'declined', 'waitlist', 'runningLate', 'review', 'reminder24h', 'reminder2h'];

export const createDefaultEmailConfig = () => ({
  provider: 'resend',
  serverManaged: true,
  serviceId: '',
  publicKey: '',
  universalTemplateId: '',
  testEmail: '',
  templates: {
    confirmed: '',
    review: '',
    waitlist: '',
    runningLate: ''
  }
});

export const createDefaultEmailNotifications = () => ({
  auth: true,
  ownerNewBooking: true,
  clientBookingReceived: true,
  bookingUpdates: true,
  reminders: true
});

export const createDefaultInAppNotifications = () => ({
  ownerNewBooking: true,
  clientBookingReceived: true,
  bookingUpdates: true,
  reminders: true,
  messages: true
});

export const createDefaultCommunications = () => ({
  bookingReceived: { active: true, text: 'We received your booking request and will review it shortly. You can track updates in your client portal.' },
  confirmed: { active: true, text: "Your booking request is confirmed! We look forward to seeing you." },
  declined: { active: true, text: 'We could not approve that booking request. Open your portal to chat or request another time.' },
  review: { active: true, text: "Hey! Thanks for coming in today. We'd love it if you could leave a quick review." },
  waitlist: { active: true, text: "A spot just opened up for you! Tap here to claim it." },
  runningLate: { active: true, text: "Running 10-15 mins behind. See you soon!" },
  reminder24h: { active: true, text: 'Your booking is tomorrow. Open your portal for details or to message the business.' },
  reminder2h: { active: true, text: 'Your booking is coming up soon. Open your portal if you need to message or reschedule.' },
  emailNotifications: createDefaultEmailNotifications(),
  inAppNotifications: createDefaultInAppNotifications(),
  emailProvider: createDefaultEmailConfig()
});

export const normalizeCommunications = (communications = {}) => {
  const defaults = createDefaultCommunications();
  const normalizedTemplates = emailMessageKeys.reduce((acc, key) => ({
    ...acc,
    [key]: { ...defaults[key], ...(communications[key] || {}) }
  }), {});
  return {
    ...defaults,
    ...communications,
    ...normalizedTemplates,
    emailNotifications: {
      ...defaults.emailNotifications,
      ...(communications.emailNotifications || communications.emailChannels || {})
    },
    inAppNotifications: {
      ...defaults.inAppNotifications,
      ...(communications.inAppNotifications || communications.inAppChannels || {})
    },
    emailProvider: {
      ...defaults.emailProvider,
      ...(communications.emailProvider || {}),
      templates: {
        ...(defaults.emailProvider?.templates || {}),
        ...(communications.emailProvider?.templates || {})
      }
    }
  };
};
