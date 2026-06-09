import process from 'node:process';

const required = (name) => {
  const value = String(process.env[name] || '').trim();
  if (!value) throw new Error(`${name} is required for hosted payment sandbox QA.`);
  return value;
};

const optional = (name, fallback = '') => String(process.env[name] || fallback).trim();

const projectId = optional('BAB_FIREBASE_PROJECT_ID', 'build-a-booking');
const appId = optional('BAB_PAYMENT_APP_ID', 'build-a-booking-v2');
const callableBaseUrl = optional('BAB_CALLABLE_BASE_URL', `https://us-central1-${projectId}.cloudfunctions.net`).replace(/\/$/, '');
const hostedProviders = optional('BAB_PAYMENT_PROVIDERS', 'stripe,yoco,payfast,paystack')
  .split(',')
  .map((provider) => provider.trim().toLowerCase())
  .filter(Boolean);
const allowedMutation = optional('BAB_PAYMENT_SANDBOX_ALLOW_MUTATION', 'false').toLowerCase() === 'true';

const hideUrl = (rawUrl) => {
  try {
    const parsed = new URL(rawUrl);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return '[unparseable checkout URL]';
  }
};

const callCallable = async (name, data) => {
  const response = await fetch(`${callableBaseUrl}/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ data })
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok || body.error) {
    const message = body.error?.message || body.message || `Callable ${name} failed with HTTP ${response.status}.`;
    throw new Error(message);
  }
  return body.result ?? body;
};

const assertSafePublicOptions = async ({ publicSlug }) => {
  const result = await callCallable('getPublicPaymentOptions', { appId, publicSlug });
  const options = Array.isArray(result.options) ? result.options : [];
  const unsafeHosted = options.filter((option) => {
    const gatewayType = String(option.gatewayType || option.id || '').toLowerCase();
    if (!['stripe', 'yoco', 'payfast', 'paystack'].includes(gatewayType)) return false;
    return Object.keys(option.credentialSummary || {}).length > 0;
  });
  if (unsafeHosted.length) {
    throw new Error(`Hosted public payment options exposed credential summaries: ${unsafeHosted.map((option) => option.id).join(', ')}`);
  }
  console.log(`ok - getPublicPaymentOptions returned ${options.length} safe public option(s) for ${publicSlug}.`);
};

const assertHostedCheckout = async ({ businessId, provider }) => {
  const paymentId = `launch_${provider}_${Date.now()}`;
  const result = await callCallable('initiatePayment', {
    appId,
    businessId,
    gatewayType: provider,
    bookingId: paymentId,
    amountInCents: Number(optional('BAB_PAYMENT_AMOUNT_CENTS', '100')),
    currency: optional('BAB_PAYMENT_CURRENCY', 'ZAR'),
    description: `Build A Booking launch sandbox check ${provider}`,
    customerEmail: optional('BAB_PAYMENT_CUSTOMER_EMAIL', 'launch-check@example.com'),
    customerName: optional('BAB_PAYMENT_CUSTOMER_NAME', 'Launch Check'),
    successUrl: optional('BAB_PAYMENT_SUCCESS_URL', 'https://build-a-booking.web.app/#/dashboard/bookings?payment=sandbox&status=success'),
    cancelUrl: optional('BAB_PAYMENT_CANCEL_URL', 'https://build-a-booking.web.app/#/dashboard/bookings?payment=sandbox&status=cancelled')
  });

  if (result.ok !== true || result.gatewayType !== provider || !result.paymentId || !result.checkoutUrl) {
    throw new Error(`${provider} did not return a complete checkout result.`);
  }
  console.log(`ok - ${provider} sandbox checkout ready: ${hideUrl(result.checkoutUrl)} (${result.paymentId})`);
};

const main = async () => {
  if (!allowedMutation) {
    throw new Error('Set BAB_PAYMENT_SANDBOX_ALLOW_MUTATION=true to create real sandbox checkout attempts.');
  }
  const businessId = required('BAB_PAYMENT_BUSINESS_ID');
  const publicSlug = optional('BAB_PAYMENT_PUBLIC_SLUG');
  if (publicSlug) {
    await assertSafePublicOptions({ publicSlug });
  }
  if (!hostedProviders.length) {
    throw new Error('BAB_PAYMENT_PROVIDERS must include at least one hosted provider.');
  }
  for (const provider of hostedProviders) {
    if (!['stripe', 'yoco', 'payfast', 'paystack'].includes(provider)) {
      throw new Error(`Unsupported hosted sandbox provider: ${provider}`);
    }
    await assertHostedCheckout({ businessId, provider });
  }
  console.log('Hosted payment sandbox gate passed.');
};

main().catch((error) => {
  console.error(`Hosted payment sandbox gate failed: ${error.message}`);
  process.exit(1);
});
