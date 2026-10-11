import { catalogUnitCostCents } from '../../functions/financialSnapshots.js';
import { buildListingEnquiryThread } from '../../functions/enquiryThread.js';
import { getListingType, isEnquiryListing } from '../../functions/listingTypes.js';
import { serviceNeedsTimingConversation } from '../../functions/serviceTiming.js';

export const DEMO_SHOWCASE_ACTIVITY_SCHEMA = 1;
const DAY = 86400000;
const MINUTE = 60000;
const AVATAR = '/assets/placeholders/profile-avatar.svg';
const pad = value => String(value).padStart(3, '0');
const sessionId = index => `showcase-session-${pad(index + 1)}`;
const dateKey = timestamp => {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Johannesburg', year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(timestamp);
  const value = key => parts.find(part => part.type === key)?.value;
  return `${value('year')}-${value('month')}-${value('day')}`;
};
const money = value => Math.max(0, Math.round((Number(value) || 0) * 100));
const activeVariant = item => (item.variants || []).find(variant => variant.available !== false && variant.active !== false) || null;
const attribution = (index, kind) => index % 4 === 0
  ? { analyticsSessionId: sessionId(index), analyticsSource: 'direct' }
  : { analyticsSessionId: sessionId(index), analyticsSource: 'places', discoverySurface: index % 3 === 0 ? 'places' : kind === 'product' ? 'buy' : 'book' };

const CLIENT_NAMES = [
  'Amara Dlamini', 'Ben Williams', 'Chloe Jacobs', 'Daniel Naidoo', 'Elena van Zyl', 'Farah Davids',
  'Grace Mokoena', 'Hugo Botha', 'Isabella Martins', 'Jason Petersen', 'Keisha Adams', 'Luca Rossi',
  'Mei Chen', 'Noah Mthembu', 'Olivia Smith', 'Priya Pillay', 'Ruben de Klerk', 'Sara Khan',
  'Thabo Ndlovu', 'Uma Patel', 'Vusi Radebe', 'Wendy Daniels', 'Yusuf Mohamed', 'Zoe Green'
];

function financialSnapshot(paymentStatus, amountInCents, createdAt, now, id) {
  const paidAt = Math.min(now, createdAt + 18 * MINUTE);
  const paid = ['paid', 'refunded'].includes(paymentStatus);
  return {
    paymentStatus, paymentMethod: paymentStatus === 'manual_pending' ? 'manual_eft' : paid ? 'card' : 'cash',
    paymentReference: `DEMO-${id.toUpperCase()}`,
    ...(paid ? { paidAt, amountPaidInCents: amountInCents } : {}),
    ...(paymentStatus === 'refunded' ? { refundedAt: Math.min(now, paidAt + DAY), refundedAmountInCents: amountInCents, refundIsFull: true } : {})
  };
}

/** Linked, device-only examples. Prices and costs are captured once in each receipt. */
export function createShowcaseActivity({ products = [], services = [], staff = [], now = Date.now() } = {}) {
  const clients = CLIENT_NAMES.map((name, index) => ({
    id: `showcase-client-${pad(index + 1)}`, name, email: `client${String(index + 1).padStart(2, '0')}@demo.bookandbuy.example`,
    phone: `+2771555${String(index + 1).padStart(4, '0')}`, photoURL: AVATAR,
    createdAt: now - (89 - index * 2) * DAY, tags: ['Demo client'], notes: 'Sample customer for exploring bookings, orders and conversations.'
  }));
  const retail = products.filter(product => product.active !== false && !['draft', 'archived'].includes(product.status) && !isEnquiryListing(product) && !product.quoteBased && product.priceType !== 'quote');
  if (!retail.length) throw new Error('The showcase activity needs a purchasable product.');
  const orderStatuses = [...Array(3).fill('pending'), ...Array(4).fill('accepted'), ...Array(9).fill('shipped'), ...Array(6).fill('fulfilled'), ...Array(2).fill('cancelled')];
  const orderPayments = ['manual_pending', 'unpaid', 'failed', 'paid', 'manual_pending', 'paid', 'unpaid', ...Array(14).fill('paid'), 'refunded', 'unpaid', 'refunded'];
  const orders = orderStatuses.map((status, index) => {
    const client = clients[index];
    const product = retail[index % retail.length];
    const variant = activeVariant(product);
    const quantity = index % 5 === 0 ? 2 : 1;
    const unitPriceCents = money(variant?.price ?? product.price);
    const unitCostInCents = catalogUnitCostCents(product, variant);
    const subtotalCents = unitPriceCents * quantity;
    const collection = index % 3 === 0;
    const shippingAmountInCents = collection ? 0 : 6500;
    const amountInCents = subtotalCents + shippingAmountInCents;
    const createdAt = now - Math.min(86, index * 3 + (index < 3 ? 0 : 1)) * DAY - (20 + index * 5) * MINUTE;
    const id = `showcase-order-${pad(index + 1)}`;
    return {
      id, ownerId: 'demo-owner', clientId: client.id, clientName: client.name, clientEmail: client.email, clientPhone: client.phone,
      status, timestamp: createdAt, createdAt, updatedAt: Math.min(now, createdAt + (status === 'pending' ? 0 : DAY)),
      items: [{ productId: product.id, variantId: variant?.id || '', name: product.name,
        variantLabel: variant?.title || Object.values(variant?.optionValues || {}).join(' / '), quantity,
        unitPriceCents, lineTotalCents: subtotalCents, unitCostInCents,
        lineCostInCents: unitCostInCents == null ? null : unitCostInCents * quantity }],
      subtotalCents, shippingAmountInCents, amountInCents, totalCents: amountInCents,
      costBasisInCents: unitCostInCents == null ? null : unitCostInCents * quantity,
      currency: 'R', fulfillmentMethod: collection ? 'pickup' : 'shipping',
      ...(collection ? {} : { shippingAddress: { recipient: client.name, line1: `${12 + index} Example Avenue`, city: 'Cape Town', province: 'Western Cape', postalCode: '8001', country: 'South Africa', countryCode: 'ZA' } }),
      ...financialSnapshot(orderPayments[index], amountInCents, createdAt, now, id), ...attribution(index, 'product')
    };
  });

  const staffById = new Map(staff.map(member => [member.id, member]));
  const serviceById = new Map(services.map(service => [service.id, service]));
  const attendance = [
    ['yoga_pilates-spot', ['confirmed', 'confirmed', 'pending']],
    ['fitness_pt-spot', Array(4).fill('confirmed')],
    ['sports_coaching-spot', ['confirmed', 'confirmed', 'pending']],
    ['dance-spot', Array(4).fill('confirmed')],
    ['martial_arts-spot', Array(6).fill('confirmed')],
    ['cooking_classes-spot', ['confirmed', 'confirmed', 'confirmed', 'pending']],
    ['tutoring-spot', Array(6).fill('confirmed')]
  ];
  const bookings = [];
  const createBooking = (service, status, client, slotOffset = null) => {
    if (!service) throw new Error('The showcase attendance needs its configured service.');
    const index = bookings.length;
    const variant = activeVariant(service);
    const id = `showcase-booking-${pad(index + 1)}`;
    const isClass = service.scheduleType === 'class_session';
    const bookingDate = isClass ? service.sessionStartDate : dateKey(now + slotOffset * DAY);
    const time = isClass ? service.sessionStartTime : ['10:00', '14:00', '11:00', '09:00', '13:00', '15:00'][index % 6];
    const startsAt = Date.parse(`${bookingDate}T${time}:00+02:00`);
    const createdAt = Math.min(now - (2 + index % 28) * DAY - (25 + index) * MINUTE, Number.isFinite(startsAt) ? startsAt - 2 * DAY : now);
    const amountInCents = ['free', 'quote'].includes(service.priceType) ? 0 : money(variant?.price ?? service.price);
    const unitCostInCents = catalogUnitCostCents(service, variant);
    const assigned = staffById.get(service.staffIds?.[0]);
    const paymentStatus = status === 'cancelled' ? (index % 2 ? 'refunded' : 'unpaid')
      : status === 'declined' ? 'failed' : status === 'waitlist' ? 'unpaid'
      : status === 'pending' ? ['manual_pending', 'unpaid', 'failed'][index % 3]
      : index % 9 === 0 ? 'unpaid' : 'paid';
    const booking = {
      id, ownerId: 'demo-owner', clientId: client.id, clientName: client.name, clientEmail: client.email, clientPhone: client.phone,
      serviceId: service.id, serviceName: service.name, serviceVariantId: variant?.id || '', serviceVariantName: variant?.name || '',
      scheduleType: service.scheduleType, dateKey: bookingDate, time, durationMinutes: Number(variant?.minDuration || service.duration || service.minDuration || 60),
      ...(isClass ? { sessionStartDate: service.sessionStartDate, sessionEndDate: service.sessionEndDate, sessionStartTime: service.sessionStartTime, sessionEndTime: service.sessionEndTime } : {}),
      ...(assigned ? { staffId: assigned.id, staffName: assigned.name } : {}),
      status, timestamp: createdAt, createdAt, updatedAt: Math.min(now, createdAt + 20 * MINUTE),
      amountInCents, serviceCostInCents: unitCostInCents, costBasisInCents: unitCostInCents, currency: 'R',
      notes: status === 'waitlist' ? 'Please let me know if a place opens up.' : '',
      ...financialSnapshot(paymentStatus, amountInCents, createdAt, now, id), ...attribution(24 + index, 'service')
    };
    bookings.push(booking);
    return booking;
  };
  for (const [suffix, statuses] of attendance) {
    const service = serviceById.get(`showcase-service-${suffix}`);
    statuses.forEach(status => createBooking(service, status, clients[bookings.length % clients.length]));
  }
  createBooking(serviceById.get('showcase-service-fitness_pt-spot'), 'waitlist', clients[20]);
  const slots = services.filter(service => service.scheduleType !== 'class_session' && !serviceNeedsTimingConversation(service));
  if (slots.length < 6) throw new Error('The showcase activity needs six distinct bookable Slot services.');
  ['confirmed', 'confirmed', 'pending', 'cancelled', 'cancelled', 'declined'].forEach((status, index) => {
    createBooking(slots[index], status, clients[(index + 7) % clients.length], [-14, -7, 3, -20, -27, -10][index]);
  });

  const thread = (index, subject, messages, extra = {}) => {
    const client = clients[index];
    const createdAt = now - (index === 0 ? 0 : index * 2) * DAY - 120 * MINUTE;
    const items = messages.map((body, messageIndex) => ({ id: `showcase-message-${pad(index + 1)}-${messageIndex + 1}`, type: 'text', from: messageIndex % 2 ? 'business' : 'client', body, at: createdAt + messageIndex * 4 * MINUTE }));
    const last = items.at(-1);
    return { id: `showcase-thread-${pad(index + 1)}`, ownerId: 'demo-owner', clientId: client.id,
      clientName: client.name, clientEmail: client.email, clientPhone: client.phone, subject,
      brandName: 'Your Business', workspaceSlug: 'example', logoUrl: AVATAR,
      unread: index % 4 === 0, unreadForClient: false, createdAt, updatedAt: last.at, lastMessageAt: last.at,
      lastMessageFrom: last.from, lastMessagePreview: last.body, messages: items,
      presence: { status: 'offline', visible: false, lastSeenAt: last.at },
      ...attribution(61 + index, 'service'), ...extra };
  };
  const timingServices = services.filter(serviceNeedsTimingConversation);
  const threads = Array.from({ length: 6 }, (_, index) => {
    const service = timingServices[index % timingServices.length];
    if (!service) throw new Error('The showcase activity needs an arranged or announced-later service.');
    const arranged = service.timingMode === 'arranged';
    return thread(index, `${arranged ? 'Arrange a time' : 'Upcoming dates'} · ${service.name}`,
      arranged ? [
        `Hi! I’m interested in ${service.name}. Could we arrange a time for next week?`,
        'Absolutely! Tell us which days work for you and we’ll check with the team.',
        'Tuesday afternoon or Saturday morning would be lovely, thank you.',
        'Perfect, we’ll check those options and confirm the details here before you book.'
      ] : [
        `Hey! Do you know when the next ${service.name} will run?`,
        'Thanks for asking! We’re finalising the next dates with the team.',
        'Great, could you let me know when bookings open?',
        'Of course. We’ll keep you posted here as soon as the dates are ready.'
      ], { serviceId: service.id, serviceName: service.name });
  });
  const listings = products.filter(product => isEnquiryListing(product) && product.listingAvailability !== 'sold' && product.listingAvailability !== 'reserved');
  if (!listings.length) throw new Error('The showcase activity needs a vehicle enquiry listing.');
  const listingEnquiries = listings.slice(0, 1).map((product, index) => {
    const client = clients[index + 6];
    const createdAt = now - (5 + index * 3) * DAY - 90 * MINUTE;
    const id = `showcase-enquiry-${pad(index + 1)}`;
    const record = { id, requestId: `showcase-enquiry-request-${pad(index + 1)}`, ownerId: 'demo-owner', slug: 'example',
      productId: product.id, productName: product.name, listingType: getListingType(product), askingPrice: String(product.price ?? ''), currency: 'R',
      customerName: client.name, email: client.email, phone: client.phone, message: `Hi! Is ${product.name} still available? I’d love to arrange a closer look.`,
      intent: index === 1 ? 'enquiry' : 'viewing', status: ['new', 'contacted', 'closed'][index], ownerNotes: '', createdAt, updatedAt: createdAt + 12 * MINUTE, revision: 0,
      threadId: `enquiry-${id}`, ...attribution(67 + index, 'product') };
    const { thread: initial, message } = buildListingEnquiryThread(record, { brandName: 'Your Business', logoUrl: AVATAR });
    const replies = [{ id: `${id}-reply`, type: 'text', from: 'business', body: 'Hi! Thanks for getting in touch. We can help with the details and a suitable viewing time.', at: record.updatedAt }];
    record.conversationMessages = replies;
    record.threadPatch = { unread: index === 0, ...attribution(67 + index, 'product') };
    threads.push({ ...initial, ...record.threadPatch, clientId: client.id, createdAt, productId: product.id,
      updatedAt: record.updatedAt, lastMessageAt: record.updatedAt, lastMessageFrom: 'business', lastMessagePreview: replies[0].body, messages: [message, ...replies] });
    return record;
  });
  [products.find(product => product.quoteBased), products.find(product => product.exploreSubcategoryId === 'equipment_tools')].forEach((product, index) => {
    if (!product) return;
    threads.push(thread(7 + index, `Product question · ${product.name}`, [
      `Hi! Could you help me with a few details about ${product.name}?`,
      product.quoteBased ? 'Of course! Tell us the size and occasion you have in mind and we can discuss a quote.' : 'Of course! Tell us what you plan to use it for and we can help you check the specifications.',
      'Thank you, that would be great.'
    ], { productId: product.id, productName: product.name }));
  });
  [0, 7].forEach((orderIndex, index) => {
    const order = orders[orderIndex];
    threads.push(thread(9 + index, `Order update · ${order.items[0].name}`, [
      'Hi! Could I please get a quick update on my order?',
      order.status === 'pending' ? 'Of course! Your order is in our queue. We’ll confirm the payment and keep you updated.' : 'Absolutely. Your order has shipped, and we can help with the collection or delivery details.',
      'Lovely, thanks for the update!', 'You’re welcome. Just message us if you need anything else.'
    ], { clientId: order.clientId, clientName: order.clientName, clientEmail: order.clientEmail, clientPhone: order.clientPhone, orderId: order.id }));
  });
  const reschedule = bookings.find(booking => booking.scheduleType !== 'class_session' && booking.status === 'pending');
  threads.push(thread(11, `Reschedule · ${reschedule.serviceName}`, [
    'Hi! Could we move my booking to a later time that day?', 'No problem. What time would suit you better?',
    'Would mid-afternoon work?', 'We’ll check the team’s availability and confirm an updated time here.'
  ], { clientId: reschedule.clientId, clientName: reschedule.clientName, clientEmail: reschedule.clientEmail, clientPhone: reschedule.clientPhone, bookingId: reschedule.id }));
  return { clients, orders, bookings, threads, listingEnquiries };
}

export const SHOWCASE_ANALYTICS_TRACKING = Object.freeze({
  visitorIdentity: true, pageViews: true, offerViews: true, discoveryViews: true, offerClicks: true,
  cartAdds: true, itemAdds: true, checkout: true, places: true, messageLeads: true, attribution: true,
  bookingStarts: true, discoverySurfaces: ['places', 'buy', 'book']
});

/** Explicit demo observations only; source records remain the sole receipt/revenue basis. */
export function createShowcaseAnalytics(workspace = {}, now = Date.now()) {
  const anchor = Number(workspace.demoGeneratedAt) || now;
  if (workspace.isDemo !== true || workspace.demoShowcaseActivitySchema !== DEMO_SHOWCASE_ACTIVITY_SCHEMA) {
    return { sessions: [], events: [], carts: [], tracking: {}, activityNow: now };
  }
  const products = workspace.products || [];
  const services = workspace.services || [];
  const records = [...(workspace.orders || []).map(row => ({ row, kind: 'product' })), ...(workspace.bookings || []).map(row => ({ row, kind: 'service' }))];
  const receiptBySession = new Map(records.map(record => [record.row.analyticsSessionId, record]));
  const threadBySession = new Map((workspace.threads || []).map(row => [row.analyticsSessionId, row]));
  const locations = [
    ['ZA', 'Cape Town', 'Western Cape', -33.9, 18.4], ['ZA', 'Johannesburg', 'Gauteng', -26.2, 28.0],
    ['GB', 'London', 'England', 51.5, -0.1], ['US', 'New York', 'New York', 40.7, -74.0],
    ['DE', 'Berlin', 'Berlin', 52.5, 13.4], ['AU', 'Sydney', 'New South Wales', -33.9, 151.2]
  ];
  const sessions = Array.from({ length: 600 }, (_, index) => {
    const id = sessionId(index);
    const record = receiptBySession.get(id)?.row;
    const conversation = threadBySession.get(id);
    const live = index >= 594;
    const startedAt = record ? Number(record.timestamp ?? record.createdAt) - MINUTE
      : conversation ? Number(conversation.createdAt ?? conversation.messages?.[0]?.at ?? conversation.updatedAt) - MINUTE
      : live ? anchor - 4 * MINUTE - (index - 594) * 9000
      : anchor - ((index * 37) % 90) * DAY - (40 + index % 400) * MINUTE;
    const source = record?.analyticsSource || conversation?.analyticsSource || (index % 4 ? 'places' : 'direct');
    const surface = source === 'places' ? record?.discoverySurface || conversation?.discoverySurface || ['places', 'buy', 'book'][index % 3] : '';
    const place = locations[index % locations.length];
    const engagedTimeMs = live || record || conversation ? 90000 : index % 5 === 0 ? 0 : (30 + index % 180) * 1000;
    const lastSeenAt = live ? anchor - (index - 594) * 7000 : Math.min(anchor, startedAt + Math.max(45000, engagedTimeMs));
    return { id, sessionId: id, ownerId: workspace.ownerId || 'demo-owner', slug: workspace.slug || 'example',
      analyticsVersion: 2, visitorId: `showcase-visitor-${pad(index % 320 + 1)}`, source,
      ...(surface ? { acquisitionSurface: surface, discoverySurface: surface } : {}),
      startedAt, lastSeenAt, updatedAt: lastSeenAt, ...(live ? {} : { endedAt: lastSeenAt, ended: true }),
      engagedTimeMs, isEngaged: engagedTimeMs > 0, path: `/b/${workspace.slug || 'example'}/${surface === 'book' ? 'book' : surface === 'buy' ? 'buy' : 'home'}`,
      device: ['mobile', 'desktop', 'mobile', 'tablet'][index % 4], referrer: source === 'places' ? '' : ['', 'https://www.google.com/', 'https://www.instagram.com/'][Math.floor(index / 4) % 3],
      country: place[0], city: place[1], region: place[2], latitude: place[3], longitude: place[4], isBot: false };
  });
  const firstSeen = new Map();
  sessions.forEach(session => firstSeen.set(session.visitorId, Math.min(firstSeen.get(session.visitorId) ?? Infinity, session.startedAt)));
  sessions.forEach(session => { session.visitorFirstSeenAt = firstSeen.get(session.visitorId); session.isReturningVisitor = session.startedAt > session.visitorFirstSeenAt; });
  const events = [];
  const carts = [];
  const add = (session, type, offset, extra = {}) => {
    const at = Math.min(session.lastSeenAt, session.startedAt + offset * 1000);
    events.push({ id: `${session.sessionId}-${type}-${events.length}`, type, at, sessionId: session.sessionId,
      visitorId: session.visitorId, visitorFirstSeenAt: session.visitorFirstSeenAt, isReturningVisitor: session.isReturningVisitor,
      analyticsVersion: 2, commerceVersion: 1, source: session.source, analyticsSource: session.source,
      ...(session.discoverySurface ? { discoverySurface: session.discoverySurface, discoveryVersion: 1 } : {}), path: session.path, ...extra });
  };
  sessions.forEach((session, index) => {
    const receipt = receiptBySession.get(session.sessionId);
    const conversation = threadBySession.get(session.sessionId);
    const kind = receipt?.kind || (session.discoverySurface === 'book' || index % 2 ? 'service' : 'product');
    const catalog = kind === 'service' ? services : products;
    const id = receipt ? kind === 'service' ? receipt.row.serviceId : receipt.row.items?.[0]?.productId : catalog[index % Math.max(1, catalog.length)]?.id;
    const item = catalog.find(row => row.id === id);
    const itemFields = item ? { itemKind: kind, ...(kind === 'service' ? { serviceId: item.id, serviceName: item.name } : { productId: item.id, productName: item.name }) } : {};
    const path = `/b/${workspace.slug || 'example'}/${kind === 'service' ? 'book' : 'buy'}${id ? `/${id}` : ''}`;
    add(session, 'page_view', 1, { page: 'home', path: `/b/${workspace.slug || 'example'}/home` });
    if (session.source === 'places') {
      add(session, 'discovery_visit', 2, { discoveryAction: 'impression', discoveryTarget: session.discoverySurface === 'places' ? 'business' : kind, ...itemFields });
      add(session, 'discovery_visit', 3, { discoveryAction: 'visit', discoveryTarget: session.discoverySurface === 'places' ? 'business' : kind });
    }
    if (item) {
      add(session, 'product_view', 5, { ...itemFields, path });
      if (index % 2 === 0) add(session, 'product_view', 6, { ...itemFields, path, interaction: 'click' });
      if (session.engagedTimeMs > 0) add(session, 'page_view', 7, { ...itemFields, path, page: kind === 'service' ? 'book' : 'buy' });
    }
    const canCart = item && (kind === 'service' ? !serviceNeedsTimingConversation(item) && receipt?.row.status !== 'waitlist' : !isEnquiryListing(item) && !item.quoteBased && item.priceType !== 'quote');
    if (canCart && (receipt || index % 7 === 0 || index >= 594)) {
      add(session, 'add_to_cart', 10, { ...itemFields, path });
      const checkout = Boolean(receipt) || index % 3 === 0 || index >= 597;
      if (checkout) add(session, 'begin_checkout', 13, { ...itemFields, path });
      carts.push({ id: `showcase-cart-${pad(index + 1)}`, cartId: `showcase-cart-${pad(index + 1)}`, sessionId: session.sessionId,
        visitorId: session.visitorId, source: session.source, ...(session.discoverySurface ? { discoverySurface: session.discoverySurface } : {}),
        status: receipt ? 'completed' : index >= 594 ? checkout ? 'checkout' : 'active' : 'abandoned',
        createdAt: session.startedAt + 10000, updatedAt: session.lastSeenAt,
        items: [{ ...itemFields, name: item.name, quantity: receipt?.row.items?.[0]?.quantity || 1 }] });
      if (receipt) add(session, 'purchase', 61, { ...itemFields, checkoutId: `showcase-checkout-${pad(index + 1)}`,
        ...(kind === 'product' ? { orderId: receipt.row.id } : { bookingId: receipt.row.id, bookingIds: [receipt.row.id] }) });
    }
    if (receipt?.kind === 'service') add(session, 'booking_started', 61, { ...itemFields, bookingId: receipt.row.id });
    if (conversation) add(session, 'message_lead', 61, { threadId: conversation.id, ...(conversation.serviceId ? { serviceId: conversation.serviceId, itemKind: 'service' } : {}) });
  });
  return { sessions, events, carts, tracking: SHOWCASE_ANALYTICS_TRACKING, activityNow: anchor };
}
