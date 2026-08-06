export const GATEWAY_META = {
  stripe: {
    id: 'stripe',
    name: 'Stripe',
    blurb: 'Card checkout with API keys. Test or live mode.',
    needsKeys: true
  },
  paystack: {
    id: 'paystack',
    name: 'Paystack',
    blurb: 'Card checkout with merchant API keys (not Connect/subaccounts).',
    needsKeys: true
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

export const GATEWAY_ORDER = ['stripe', 'paystack', 'manual_eft', 'cash'];
