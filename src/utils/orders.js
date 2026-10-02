export function createPublicProductOrder({
  workspaceSlug,
  workspaceName,
  items = [],
  client = {},
  shipping = { amountInCents: 0, profileIds: [] },
  currency = 'R',
  paymentMethod = 'cash'
} = {}) {
  if (!workspaceSlug) {
    throw new Error('workspaceSlug is required');
  }
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error('At least one line item is required');
  }
  if (!String(client.clientName || '').trim()) {
    throw new Error('clientName is required');
  }

  const lineItems = items.map((item) => {
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
    const unitPriceCents = Math.max(0, Math.round(Number(item.unitPriceCents) || 0));
    return {
      productId: item.productId,
      variantId: item.variantId || '',
      name: item.name,
      quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * quantity
    };
  });

  const subtotalCents = lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const amountInCents = subtotalCents + shipping.amountInCents;
  const method = ['card', 'stripe', 'paypal', 'paystack', 'cash'].includes(paymentMethod)
    ? paymentMethod === 'card'
      ? 'stripe'
      : paymentMethod
    : 'cash';
  const isManual = method === 'cash' || method === 'manual_eft';

  return {
    id: `ord-${Date.now()}`,
    requestType: 'product_order',
    orderType: 'product',
    workspaceSlug,
    workspaceName: workspaceName || workspaceSlug,
    items: lineItems,
    clientName: String(client.clientName).trim(),
    clientEmail: String(client.clientEmail || '').trim(),
    clientPhone: String(client.clientPhone || '').trim(),
    clientNote: String(client.clientNote || '').trim(),
    clientUid: String(client.clientUid || '').trim(),
    clientCountry: String(client.country || '').trim(),
    shippingAddress: client.shippingAddress || '',
    shippingAmountInCents: shipping.amountInCents,
    shippingProfileIds: shipping.profileIds,
    subtotalCents,
    paymentMethod: method,
    paymentStatus: isManual ? 'manual_pending' : 'unpaid',
    status: 'pending',
    amountInCents,
    currency,
    source: 'public_shop',
    timestamp: Date.now()
  };
}
