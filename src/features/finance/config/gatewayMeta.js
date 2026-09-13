export const GATEWAY_META = {
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    blurb: 'Clients pay on Stripe’s secure checkout page. Funds go to your Stripe account.',
    needsKeys: true,
    docsUrl: 'https://dashboard.stripe.com/apikeys',
    publicLabel: 'Publishable key',
    secretLabel: 'Secret key',
    publicPlaceholder: 'pk_test_… or pk_live_…',
    secretPlaceholder: 'sk_test_… or sk_live_…'
  },
  paypal: {
    id: 'paypal',
    name: 'PayPal',
    blurb: 'Clients approve payment on PayPal. Funds go to your PayPal business account.',
    needsKeys: true,
    docsUrl: 'https://developer.paypal.com/dashboard/applications',
    publicLabel: 'Client ID',
    secretLabel: 'Client secret',
    publicPlaceholder: 'Client ID from PayPal Developer Dashboard',
    secretPlaceholder: 'Secret from PayPal Developer Dashboard'
  },
  paystack: {
    id: 'paystack',
    name: 'Paystack',
    blurb: 'Clients pay on Paystack’s secure page. Strong fit for South African cards.',
    needsKeys: true,
    docsUrl: 'https://dashboard.paystack.com/#/settings/developer',
    publicLabel: 'Public key',
    secretLabel: 'Secret key',
    publicPlaceholder: 'pk_test_… or pk_live_…',
    secretPlaceholder: 'sk_test_… or sk_live_…'
  },
  manual_eft: {
    id: 'manual_eft',
    name: 'Manual EFT',
    blurb: 'Share bank details; mark paid when funds land.',
    needsKeys: false
  },
  cash: {
    id: 'cash',
    name: 'Cash',
    blurb: 'Pay in person; mark paid on the desk.',
    needsKeys: false
  }
};

export const GATEWAY_ORDER = ['stripe', 'paypal', 'paystack', 'manual_eft', 'cash'];

export const ONLINE_GATEWAY_IDS = ['stripe', 'paypal', 'paystack'];
