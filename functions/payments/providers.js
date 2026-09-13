/** Provider API helpers — merchant keys only, hosted checkout redirects. */

export async function verifyStripeKeys({ secretKey, publicKey, mode }) {
  if (!String(secretKey || '').startsWith('sk_')) {
    throw new Error('Stripe secret key should start with sk_test_ or sk_live_.');
  }
  if (publicKey && !String(publicKey).startsWith('pk_')) {
    throw new Error('Stripe publishable key should start with pk_test_ or pk_live_.');
  }
  if (mode === 'live' && String(secretKey).includes('_test_')) {
    throw new Error('Live mode requires a live Stripe secret key.');
  }
  const res = await fetch('https://api.stripe.com/v1/balance', {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Stripe key check failed (${res.status}). ${body.slice(0, 180)}`);
  }
  return { ok: true };
}

export async function createStripeCheckoutSession({
  secretKey,
  amountInCents,
  currency,
  description,
  customerEmail,
  successUrl,
  cancelUrl,
  metadata = {}
}) {
  const params = new URLSearchParams();
  params.set('mode', 'payment');
  params.set('success_url', successUrl);
  params.set('cancel_url', cancelUrl);
  params.set('line_items[0][quantity]', '1');
  params.set('line_items[0][price_data][currency]', String(currency || 'zar').toLowerCase());
  params.set('line_items[0][price_data][unit_amount]', String(Math.max(0, Math.round(amountInCents))));
  params.set('line_items[0][price_data][product_data][name]', description || 'Book and Buy payment');
  if (customerEmail) params.set('customer_email', customerEmail);
  Object.entries(metadata).forEach(([key, value]) => {
    if (value != null) params.set(`metadata[${key}]`, String(value));
  });

  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: params
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe Checkout failed (${res.status})`);
  }
  return { id: data.id, url: data.url, status: data.status };
}

export async function retrieveStripeCheckoutSession({ secretKey, sessionId }) {
  const res = await fetch(`https://api.stripe.com/v1/checkout/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message || `Stripe session retrieve failed (${res.status})`);
  }
  return data;
}

export async function verifyPayPalKeys({ clientId, secretKey, mode }) {
  if (!clientId || !secretKey) throw new Error('PayPal Client ID and secret are required.');
  const base =
    mode === 'live' ? 'https://api-m.paypal.com' : 'https://api-m.sandbox.paypal.com';
  const token = Buffer.from(`${clientId}:${secretKey}`).toString('base64');
  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${token}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });
  const data = await res.json();
  if (!res.ok || !data.access_token) {
    throw new Error(data?.error_description || `PayPal auth failed (${res.status})`);
  }
  return { ok: true, accessToken: data.access_token, base };
}

export async function createPayPalOrder({
  clientId,
  secretKey,
  mode,
  amountInCents,
  currency,
  description,
  successUrl,
  cancelUrl,
  customId
}) {
  const { accessToken, base } = await verifyPayPalKeys({ clientId, secretKey, mode });
  const value = (Math.max(0, Math.round(amountInCents)) / 100).toFixed(2);
  const res = await fetch(`${base}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [
        {
          custom_id: customId || undefined,
          description: description || 'Book and Buy payment',
          amount: {
            currency_code: String(currency || 'ZAR').toUpperCase(),
            value
          }
        }
      ],
      application_context: {
        return_url: successUrl,
        cancel_url: cancelUrl,
        user_action: 'PAY_NOW'
      }
    })
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || data?.details?.[0]?.description || `PayPal order failed (${res.status})`);
  }
  const approve = (data.links || []).find((link) => link.rel === 'approve');
  return { id: data.id, url: approve?.href, status: data.status };
}

export async function capturePayPalOrder({ clientId, secretKey, mode, orderId }) {
  const { accessToken, base } = await verifyPayPalKeys({ clientId, secretKey, mode });
  const res = await fetch(`${base}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    }
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.message || `PayPal capture failed (${res.status})`);
  }
  return data;
}

export async function verifyPaystackKeys({ secretKey, publicKey }) {
  if (!String(secretKey || '').startsWith('sk_')) {
    throw new Error('Paystack secret key should start with sk_test_ or sk_live_.');
  }
  if (publicKey && !String(publicKey).startsWith('pk_')) {
    throw new Error('Paystack public key should start with pk_test_ or pk_live_.');
  }
  const res = await fetch('https://api.paystack.co/balance', {
    headers: { Authorization: `Bearer ${secretKey}` }
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Paystack key check failed (${res.status}). ${body.slice(0, 180)}`);
  }
  return { ok: true };
}

export async function createPaystackTransaction({
  secretKey,
  amountInCents,
  email,
  currency,
  description,
  callbackUrl,
  metadata = {}
}) {
  const res = await fetch('https://api.paystack.co/transaction/initialize', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${secretKey}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email || 'customer@example.com',
      amount: Math.max(0, Math.round(amountInCents)),
      currency: String(currency || 'ZAR').toUpperCase(),
      callback_url: callbackUrl,
      metadata: {
        ...metadata,
        custom_fields: [
          {
            display_name: 'Description',
            variable_name: 'description',
            value: description || 'Book and Buy payment'
          }
        ]
      }
    })
  });
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data?.message || `Paystack initialize failed (${res.status})`);
  }
  return {
    id: data.data?.reference,
    url: data.data?.authorization_url,
    accessCode: data.data?.access_code,
    status: 'pending'
  };
}

export async function verifyPaystackTransaction({ secretKey, reference }) {
  const res = await fetch(
    `https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`,
    { headers: { Authorization: `Bearer ${secretKey}` } }
  );
  const data = await res.json();
  if (!res.ok || !data.status) {
    throw new Error(data?.message || `Paystack verify failed (${res.status})`);
  }
  return data.data;
}
