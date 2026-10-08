import { formatProductPrice, isProductPubliclyVisible } from '../../utils/products';
import { formatServicePrice, getServiceDurationMinutes } from '../../utils/services';
import { getPublicPaymentOptions } from '../../utils/payments';

// Only public catalog fields cross the preview/AI boundary. No customer records,
// provider credentials, costs or private staff schedules belong in this snapshot.
export function buildBuilderCommerceContext(workspace = {}) {
  const item = (row, kind) => ({
    id: String(row.id), kind, name: String(row.name || row.title || ''),
    description: String(row.description || '').slice(0, 800),
    image: String(row.imageUrls?.[0] || row.image || row.imageUrl || ''),
    price: kind === 'product' ? formatProductPrice(row) : formatServicePrice(row),
    quoteBased: row.quoteBased === true || row.priceType === 'quote', stockAvailable: row.stockAvailable ?? null,
    options: kind === 'product' ? (row.options || []).map(option => ({ name: option.name, values: option.values })) : [],
    variants: (row.variants || []).filter(variant => variant.active !== false).map(variant => ({ id: variant.id, name: variant.name || variant.title || '', optionValues: variant.optionValues || {}, available: variant.available !== false, price: variant.price ?? row.price, stockAvailable: variant.stockAvailable ?? null })),
    ...(kind === 'service' ? { durationMinutes: getServiceDurationMinutes(row), scheduleType: row.scheduleType || 'appointment' } : {})
  });
  return {
    business: String(workspace.brandName || 'Your business'), slug: String(workspace.slug || ''),
    currency: workspace.currency || 'R',
    products: (workspace.products || []).filter(isProductPubliclyVisible).map(row => item(row, 'product')),
    services: (workspace.services || []).filter(row => row.active !== false && row.available !== false && !['draft', 'archived'].includes(row.status)).map(row => item(row, 'service')),
    payments: getPublicPaymentOptions(workspace).options.map(option => ({ id: option.id, name: option.name, mode: option.mode })),
    booking: { timezone: workspace.timezone || 'Africa/Johannesburg', openTime: workspace.availabilityRules?.businessOpenTime || '', closeTime: workspace.availabilityRules?.businessCloseTime || '', selection: 'Book & Buy checks staff availability, service duration, existing bookings and variants when the customer chooses a time.' },
    checkout: { required: ['customer name', 'valid email', 'product variant when applicable', 'service variant when applicable', 'available date/time for appointments', 'delivery address when shipping applies'], optional: ['phone', 'notes'], preview: true },
    contract: { product: 'data-bb-product-id', service: 'data-bb-service-id', catalog: 'data-bb-catalog="products" or "services"', checkout: 'data-bb-action="checkout.create"', cart: 'data-bb-action="cart.open"' }
  };
}

export function resolveBuilderCommerceAction(workspace, action, payload = {}) {
  const source = buildBuilderCommerceContext(workspace);
  if (['cart.open', 'checkout.create'].includes(action)) return { kind: 'checkout' };
  if (action === 'cart.close') return { kind: 'close' };
  if (['product.open', 'cart.add'].includes(action)) {
    if (typeof payload.productId !== 'string' || !source.products.some(item => item.id === payload.productId)) throw new Error('That product is unavailable. Connect an active Book & Buy product.');
    return { kind: 'product', id: payload.productId };
  }
  if (['service.open', 'booking.select', 'booking.create', 'booking.date', 'booking.slot'].includes(action)) {
    if (typeof payload.serviceId !== 'string' || !source.services.some(item => item.id === payload.serviceId)) throw new Error('That service is unavailable. Connect an active Book & Buy service.');
    return { kind: 'service', id: payload.serviceId };
  }
  throw new Error('That action is not part of the Book & Buy commerce connection.');
}
