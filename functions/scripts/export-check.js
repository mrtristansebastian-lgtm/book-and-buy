const functions = require('../index');

const expectedExports = [
  'getEmailProviderStatus',
  'sendAuthVerificationEmail',
  'sendPasswordResetEmail',
  'sendBookingClientEmail',
  'createOwnerBookingRequest',
  'getPublicServiceAvailability',
  'createPublicBookingRequest',
  'getPublicPaymentOptions',
  'processNotificationJob',
  'syncBookingOperationalState',
  'sendBookingReminderNotifications',
  'cleanupOperationalDocuments',
  'backfillWorkspaceScaleCollections',
  'createCheckoutSession',
  'createBillingPortalSession',
  'initiatePayment',
  'markManualBookingPaid',
  'savePaymentGatewaySettings',
  'payfastWebhook',
  'paystackWebhook',
  'stripeWebhook',
  'yocoWebhook'
];

const missingExports = expectedExports.filter((name) => !functions[name]);

if (missingExports.length) {
  console.error(`Missing function exports: ${missingExports.join(', ')}`);
  process.exit(1);
}

console.log(`Function export check passed for ${expectedExports.length} exports.`);
