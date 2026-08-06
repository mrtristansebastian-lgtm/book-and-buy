export function createPublicProductOrder({
  workspaceSlug,
  workspaceName,
  items = [],
  client = {},
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
      name: item.name,
      quantity,
      unitPriceCents,
      lineTotalCents: unitPriceCents * quantity
    };
  });

  const amountInCents = lineItems.reduce((sum, item) => sum + item.lineTotalCents, 0);
  const method = ['card', 'stripe', 'paystack', 'manual_eft', 'cash'].includes(paymentMethod)
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
    paymentMethod: method,
    paymentStatus: isManual ? 'manual_pending' : 'unpaid',
    status: 'pending',
    amountInCents,
    currency: 'R',
    source: 'public_shop',
    timestamp: Date.now()
  };
}
