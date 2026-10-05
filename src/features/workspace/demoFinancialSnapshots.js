import { getServiceUnitPriceCents } from '../../utils/services';

const safeCents = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0;
const unitCost = (item, variant) => {
  const value = variant?.cost != null && String(variant.cost).trim() !== '' ? variant.cost : item?.cost;
  if (value == null || String(value).trim() === '' || !/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(String(value).trim())) return null;
  const cents = Math.round(Number(value) * 100);
  return safeCents(cents) ? cents : null;
};

/** Demo actions preserve the same first payment snapshot as the server. */
export function demoPaymentSnapshot(record, patch, now = Date.now()) {
  if (patch.paymentStatus !== 'paid') return {};
  if (record.paymentStatus === 'refunded') return { paymentStatus: 'refunded' };
  if (record.paymentStatus === 'paid') return {};
  return { paidAt: record.paidAt || now,
    ...(safeCents(record.amountInCents) ? { amountPaidInCents: record.amountInCents } : {}) };
}

export function demoBookingSnapshot(booking, workspace) {
  const service = (workspace.services || []).find(item => item.id === booking.serviceId);
  const variant = service?.variants?.find(item => item.id === booking.variantId);
  const costBasisInCents = unitCost(service, variant);
  const { costBasisInCents: claimedCost, ...record } = booking;
  const amountInCents = safeCents(record.amountInCents) ? record.amountInCents : service ? getServiceUnitPriceCents(service, variant) : null;
  return { ...record, currency: record.currency || workspace.currency || 'R',
    ...(safeCents(amountInCents) ? { amountInCents } : {}),
    ...(costBasisInCents != null ? { costBasisInCents } : {}) };
}

export function demoOrderCostSnapshot(order, products = []) {
  const items = order.items.map(item => {
    const product = products.find(product => product.id === item.productId);
    const variant = product?.variants?.find(variant => variant.id === item.variantId);
    const unitCostInCents = unitCost(product, variant);
    const lineCostInCents = unitCostInCents == null ? null : unitCostInCents * item.quantity;
    return { ...item, ...(safeCents(lineCostInCents) ? { unitCostInCents, lineCostInCents } : {}) };
  });
  const costBasisInCents = items.every(item => safeCents(item.lineCostInCents)) ? items.reduce((sum, item) => sum + item.lineCostInCents, 0) : null;
  return { ...order, items, ...(safeCents(costBasisInCents) ? { costBasisInCents } : {}) };
}
