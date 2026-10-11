import { formatProductPrice, isProductPubliclyVisible } from '../../utils/products';
import { formatServicePrice, getServiceDurationMinutes } from '../../utils/services';
import { getPublicPaymentOptions } from '../../utils/payments';
import { assertBusinessCommerceEnabled, isPresenceOnlyBusiness } from '../../../functions/businessCapabilities.js';
import { normalizeListing, listingDetailsKey, publicListingDetails, isEnquiryListing, listingSpecificationGroups, listingFacts } from '../../../functions/listingTypes.js';
import { normalizeServiceConfiguration, serviceConfigurationFields, serviceFacts, isRetiredEventService } from '../../../functions/serviceTemplates.js';
import { isFirstComeService } from '../../../functions/bookingModes.js';

// Only public catalog fields cross the preview/AI boundary. No customer records,
// provider credentials, costs or private staff schedules belong in this snapshot.
export function buildBuilderCommerceContext(workspace = {}) {
  const presenceOnly = isPresenceOnlyBusiness(workspace);
  const item = (row, kind) => ({
    id: String(row.id), kind, name: String(row.name || row.title || ''),
    description: String(row.description || '').slice(0, 800),
    category: String(row.category || row.mainCategory || ''),
    exploreMainCategoryId: String(row.exploreMainCategoryId || ''), exploreSubcategoryId: String(row.exploreSubcategoryId || ''),
    image: String(row.imageUrls?.[0] || row.image || row.imageUrl || ''),
    price: kind === 'product' ? formatProductPrice(row) : formatServicePrice(row),
    quoteBased: row.quoteBased === true || row.priceType === 'quote', stockAvailable: row.stockAvailable ?? null,
    options: kind === 'product' ? (row.options || []).map(option => ({ name: option.name, values: option.values })) : [],
    variants: (row.variants || []).filter(variant => variant.active !== false).map(variant => ({ id: variant.id, name: variant.name || variant.title || '', optionValues: variant.optionValues || {}, available: variant.available !== false, price: variant.price ?? row.price, stockAvailable: variant.stockAvailable ?? null })),
    ...(kind === 'product' ? { ...normalizeListing(row), [listingDetailsKey(row)]: publicListingDetails(row), listingSpecificationGroups: listingSpecificationGroups(row), listingFacts: listingFacts(row) } : {}),
    ...(kind === 'service' ? { ...normalizeServiceConfiguration(row), serviceConfigurationFields: serviceConfigurationFields(row), serviceFacts: serviceFacts(row), durationMinutes: getServiceDurationMinutes(row), scheduleType: row.scheduleType || 'appointment', timingMode: row.timingMode || '', bookingMode: isFirstComeService(workspace, row) ? 'first_come' : 'time_slots', timingNotes: String(row.timingNotes || '') } : {})
  });
  return {
    business: String(workspace.brandName || 'Your business'), slug: String(workspace.slug || ''),
    currency: workspace.currency || 'R',
    profileMode: presenceOnly ? 'presence' : 'commerce',
    products: presenceOnly ? [] : (workspace.products || []).filter(isProductPubliclyVisible).map(row => item(row, 'product')),
    services: presenceOnly ? [] : (workspace.services || []).filter(row => !isRetiredEventService(row) && row.active !== false && row.available !== false && !['draft', 'archived'].includes(row.status)).map(row => item(row, 'service')),
    payments: presenceOnly ? [] : getPublicPaymentOptions(workspace).options.map(option => ({ id: option.id, name: option.name, mode: option.mode })),
    booking: { timezone: workspace.timezone || 'Africa/Johannesburg', scheduleMode: workspace.availabilityRules?.scheduleMode || 'time_slots', openTime: workspace.availabilityRules?.businessOpenTime || '', closeTime: workspace.availabilityRules?.businessCloseTime || '', selection: workspace.availabilityRules?.scheduleMode === 'first_come' ? 'Availability-based Slots accept pending requests without a date, time or payment. Submit bookingMode first_come; the business accepts and arranges timing. Fixed Spots still use their published sessions and capacity.' : 'Book & Buy checks staff availability, service duration, existing bookings and variants when the customer chooses a time.' },
    checkout: { required: ['customer name', 'valid email', 'product variant when applicable', 'service variant when applicable', ...(workspace.availabilityRules?.scheduleMode === 'first_come' ? [] : ['available date/time for appointments']), 'delivery address when shipping applies'], optional: ['phone', 'notes'], preview: true },
    contract: { product: 'data-bb-product-id', service: 'data-bb-service-id', catalog: 'data-bb-catalog="products" or "services"', checkout: 'data-bb-action="checkout.create"', cart: 'data-bb-action="cart.open"', enquiry: 'Vehicle and equipment listings use product.open to show details and an enquiry/viewing form. They never enter cart or checkout. Show an asking price or Price on enquiry.' }
  };
}

export function resolveBuilderCommerceAction(workspace, action, payload = {}) {
  if (action === 'cart.close') return { kind: 'close' };
  assertBusinessCommerceEnabled(workspace);
  const source = buildBuilderCommerceContext(workspace);
  if (['cart.open', 'checkout.create'].includes(action)) return { kind: 'checkout' };
  if (['product.open', 'cart.add'].includes(action)) {
    if (typeof payload.productId !== 'string' || !source.products.some(item => item.id === payload.productId)) throw new Error('That product is unavailable. Connect an active Book & Buy product.');
    if (action === 'cart.add' && isEnquiryListing(source.products.find(item => item.id === payload.productId))) throw new Error('This listing accepts enquiries only. Open its details to contact the business.');
    return { kind: 'product', id: payload.productId };
  }
  if (['service.open', 'booking.select', 'booking.create', 'booking.date', 'booking.slot'].includes(action)) {
    if (typeof payload.serviceId !== 'string' || !source.services.some(item => item.id === payload.serviceId)) throw new Error('That service is unavailable. Connect an active Book & Buy service.');
    return { kind: 'service', id: payload.serviceId };
  }
  throw new Error('That action is not part of the Book & Buy commerce connection.');
}
