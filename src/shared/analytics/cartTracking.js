const key = item => item.lineKey || `${item.kind}:${item.serviceId || item.productId || item.id}:${item.variantId || ''}`;

/** Track positive item changes, not cart remounts, removals, or price edits. */
export function cartAdditions(previous = [], current = []) {
  const quantities = new Map(previous.map(item => [key(item), Number(item.quantity) || 0]));
  return current.map(item => ({ ...item, addedQuantity: (Number(item.quantity) || 0) - (quantities.get(key(item)) || 0) }))
    .filter(item => item.addedQuantity > 0);
}
