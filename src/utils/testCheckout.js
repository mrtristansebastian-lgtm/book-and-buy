/** Builder-only simulation: never persists records or calls a payment provider. */
export function buildTestCheckoutResult(items, details = {}) {
  const reference = `TEST-${Date.now().toString(36).toUpperCase()}`;
  const products = items.filter(item => item.kind === 'product');
  const services = items.filter(item => item.kind === 'service');
  return {
    test: true, reference,
    order: products.length ? { id: reference, items: products, clientName: details.clientName, paymentStatus: 'unpaid', status: 'test' } : null,
    bookings: services.map((item, index) => ({ id: `${reference}-${index}`, serviceId: item.serviceId, serviceName: item.name, variantId: item.variantId, dateKey: item.dateKey, time: item.time, clientName: details.clientName, status: 'test', paymentStatus: 'unpaid' }))
  };
}
