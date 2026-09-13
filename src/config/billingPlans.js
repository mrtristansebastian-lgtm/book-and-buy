/** Book and Buy SaaS plans — source of truth for Settings → Plan. */

export const BILLING_CURRENCY = 'ZAR';
export const BILLING_SYMBOL = 'R';
export const TRIAL_DAYS = 14;

export const PLAN_IDS = ['starter', 'studio', 'business'];

export const BILLING_PLANS = {
  starter: {
    id: 'starter',
    name: 'Starter',
    blurb: 'Solo or just getting started with Book.',
    monthlyPrice: 299,
    annualPrice: 2990,
    staffLimit: 2,
    productLimit: 10,
    locationLimit: 1,
    features: [
      'Book: services, requests, availability',
      'Pages: Home + Book',
      'Up to 2 staff',
      'Up to 10 products',
      'Email alerts for requests & orders',
      'Public slug on Book and Buy'
    ],
    includes: {
      book: true,
      buy: 'limited',
      blog: false,
      paymentGateways: false,
      bookingPolicies: false,
      clientFieldToggles: false,
      financeLedger: false,
      customDomain: false,
      reminders: false,
      prioritySupport: false
    }
  },
  studio: {
    id: 'studio',
    name: 'Studio',
    blurb: 'Growing shops that Book and Buy together.',
    monthlyPrice: 699,
    annualPrice: 6990,
    staffLimit: 10,
    productLimit: null,
    locationLimit: 1,
    features: [
      'Everything in Starter',
      'Full Buy: catalog + orders',
      'Pages + Content',
      'Up to 10 staff',
      'All payment gateways',
      'Booking policies & advance window',
      'Client checkout field toggles',
      'Finance ledger',
      'Priority email support'
    ],
    includes: {
      book: true,
      buy: true,
      blog: true,
      paymentGateways: true,
      bookingPolicies: true,
      clientFieldToggles: true,
      financeLedger: true,
      customDomain: false,
      reminders: false,
      prioritySupport: true
    }
  },
  business: {
    id: 'business',
    name: 'Business',
    blurb: 'Full studio power for multi-staff teams.',
    monthlyPrice: 1299,
    annualPrice: 12990,
    staffLimit: 40,
    productLimit: null,
    locationLimit: 1,
    features: [
      'Everything in Studio',
      'Up to 40 staff',
      'Custom domain (when Domains ships)',
      'Policies hub',
      'Reminder & SMS slots when ready',
      'Earliest feature access',
      'Priority support'
    ],
    includes: {
      book: true,
      buy: true,
      blog: true,
      paymentGateways: true,
      bookingPolicies: true,
      clientFieldToggles: true,
      financeLedger: true,
      customDomain: true,
      reminders: true,
      prioritySupport: true
    }
  }
};

export function formatPlanPrice(amount, { interval = 'month' } = {}) {
  const n = Number(amount) || 0;
  const formatted = `${BILLING_SYMBOL}${n.toLocaleString('en-ZA')}`;
  return interval === 'year' ? `${formatted}/yr` : `${formatted}/mo`;
}

export function getPlan(planId = 'starter') {
  return BILLING_PLANS[planId] || BILLING_PLANS.starter;
}

export function createDefaultPlanFields({ isDemo = false } = {}) {
  if (isDemo) {
    return {
      planId: 'business',
      billingInterval: 'month',
      planStatus: 'active',
      trialEndsAt: null
    };
  }
  const trialEndsAt = Date.now() + TRIAL_DAYS * 24 * 60 * 60 * 1000;
  return {
    planId: 'starter',
    billingInterval: 'month',
    planStatus: 'trialing',
    trialEndsAt
  };
}
