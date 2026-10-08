/** Pure inventory transitions. stockAvailable is sellable stock, after active holds. */
export const ONLINE_PAYMENT_METHODS = new Set(['stripe', 'paypal', 'paystack']);
export function inventoryHoldMs(workspace, method) {
  const online = ONLINE_PAYMENT_METHODS.has(method);
  const raw = online ? workspace.checkout?.inventoryOnlineHoldMinutes ?? 10 : workspace.checkout?.inventoryManualHoldHours ?? 24;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 1 || value > (online ? 120 : 168)) throw new Error('Correct the inventory hold duration in Checkout settings.');
  return value * (online ? 60000 : 3600000);
}
export function inventoryUnits(items = []) {
  const units = new Map();
  for (const item of items) {
    if (!item.productId || !Number.isSafeInteger(item.quantity) || item.quantity < 1) throw new Error('Invalid inventory item.');
    const key = JSON.stringify([item.productId, item.variantId || '']);
    const previous = units.get(key);
    units.set(key, { productId: item.productId, variantId: item.variantId || '', quantity: (previous?.quantity || 0) + item.quantity });
  }
  return [...units.values()];
}
function changeStock(products, units, direction) {
  const next = structuredClone(products || []); const tracked = [];
  for (const unit of units) {
    const product = next.find((item) => item.id === unit.productId);
    const target = unit.variantId ? product?.variants?.find((item) => item.id === unit.variantId) : product;
    if (!target) throw new Error('An inventory item is no longer available.');
    if (target.stockAvailable == null || String(target.stockAvailable).trim() === '') continue;
    const current = Number(target.stockAvailable);
    const after = current + direction * unit.quantity;
    if (!Number.isSafeInteger(current) || current < 0 || !Number.isSafeInteger(after) || after < 0) throw new Error('There is not enough stock for your order.');
    target.stockAvailable = String(after); tracked.push(unit);
  }
  return { products: next, tracked };
}
export function reserveInventory(workspace, order, existing = null, now = Date.now()) {
  if (existing) {
    if (existing.status === 'reserved' && existing.expiresAtMs > now || existing.status === 'committed') return { products: workspace.products, reservation: existing, changed: false };
    throw new Error('The inventory hold has expired. Create a new order.');
  }
  const { products, tracked } = changeStock(workspace.products, inventoryUnits(order.items), -1);
  return { products, reservation: { id: order.id, orderId: order.id, ownerId: order.ownerId || '', status: 'reserved', items: tracked, createdAtMs: now, expiresAtMs: now + inventoryHoldMs(workspace, order.paymentMethod), revision: 1 }, changed: true };
}
export function releaseInventory(workspace, reservation, reason = 'released', now = Date.now()) {
  if (!reservation || reservation.status !== 'reserved') return { products: workspace.products, reservation, changed: false };
  const { products } = changeStock(workspace.products, reservation.items || [], 1);
  return { products, reservation: { ...reservation, status: reason === 'expired' ? 'expired' : 'released', releaseReason: reason, releasedAtMs: now, revision: reservation.revision + 1 }, changed: true };
}
export function commitInventory(workspace, reservation, now = Date.now()) {
  if (reservation?.status === 'committed') return { products: workspace.products, reservation, changed: false, exception: false };
  if (!reservation || reservation.status !== 'reserved' || reservation.expiresAtMs <= now) {
    const release = releaseInventory(workspace, reservation, 'expired', now);
    return { ...release, exception: true };
  }
  return { products: workspace.products, reservation: { ...reservation, status: 'committed', committedAtMs: now, revision: reservation.revision + 1 }, changed: true, exception: false };
}
