import { getListingType, isEnquiryListing } from '../../../functions/listingTypes.js';
import { buildListingEnquiryThread } from '../../../functions/enquiryThread.js';

export const ENQUIRY_STATUSES = [
  { id: 'new', label: 'New' },
  { id: 'contacted', label: 'Contacted' },
  { id: 'closed', label: 'Closed' }
];
const demoKey = slug => `bb.demo.listing-enquiries.v1:${slug || 'demo'}`;
const storage = provided => provided || window.localStorage;
const notify = () => { if (typeof window !== 'undefined') window.dispatchEvent(new Event('bb-demo-enquiries')); };

export function readDemoEnquiries(slug, providedStorage) {
  const raw = storage(providedStorage).getItem(demoKey(slug));
  if (!raw) return [];
  const parsed = JSON.parse(raw);
  if (!Array.isArray(parsed)) throw new Error('Demo enquiries could not be loaded.');
  return parsed;
}

/** Demo records stay on this device and never pretend to contact a real business. */
export function saveDemoEnquiry(input, product, providedStorage) {
  if (!isEnquiryListing(product) || product.active === false || ['draft', 'archived'].includes(product.status) || product.listingAvailability && product.listingAvailability !== 'available') throw new Error('This listing is no longer available for enquiries.');
  const customerName = String(input.customerName || '').trim();
  const email = String(input.email || '').trim().toLowerCase();
  const phone = String(input.phone || '').trim();
  const message = String(input.message || '').trim();
  if (customerName.length < 2 || customerName.length > 100 || email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Enter your name and a valid email address.');
  if (phone && !/^[+()\d .-]{5,32}$/.test(phone)) throw new Error('Enter a valid phone number.');
  if (message.length > 3000 || !['enquiry', 'viewing'].includes(input.intent)) throw new Error('Check your enquiry details.');
  const rows = readDemoEnquiries(input.slug, providedStorage);
  const previous = rows.find(row => row.requestId === input.requestId);
  if (previous) return { ok: true, id: previous.id, duplicate: true };
  if (rows.length >= 500) throw new Error('The demo enquiry limit has been reached on this device.');
  const now = Date.now();
  const record = {
    id: crypto.randomUUID(), requestId: input.requestId, ownerId: 'demo', slug: input.slug,
    productId: product.id, productName: product.name || product.title || 'Listing',
    listingType: getListingType(product), askingPrice: String(product.price ?? ''), currency: product.currency || 'R',
    customerName, email, phone, message, intent: input.intent,
    status: 'new', ownerNotes: '', createdAt: now, updatedAt: now, revision: 0
  };
  record.threadId = `enquiry-${record.id}`;
  storage(providedStorage).setItem(demoKey(input.slug), JSON.stringify([record, ...rows]));
  notify();
  return { ok: true, id: record.id };
}

export function demoEnquiryThreads(slug, providedStorage) {
  return readDemoEnquiries(slug, providedStorage).map(enquiry => {
    const { thread, message } = buildListingEnquiryThread(enquiry);
    return { ...thread, ...(enquiry.threadPatch || {}), messages: [message, ...(enquiry.conversationMessages || [])] };
  });
}

export function updateDemoEnquiryThread(slug, threadId, patch, providedStorage) {
  const rows = readDemoEnquiries(slug, providedStorage);
  const current = rows.find(row => row.threadId === threadId);
  if (!current) throw new Error('Demo conversation not found.');
  const allowed = ['unread', 'subject', 'bookingId', 'orderId'];
  const safe = Object.fromEntries(allowed.filter(key => patch[key] !== undefined).map(key => [key, patch[key]]));
  const next = { ...current, threadPatch: { ...current.threadPatch, ...safe } };
  storage(providedStorage).setItem(demoKey(slug), JSON.stringify(rows.map(row => row.id === current.id ? next : row)));
  notify();
}

export function sendDemoEnquiryMessage(slug, threadId, payload, providedStorage) {
  const rows = readDemoEnquiries(slug, providedStorage);
  const current = rows.find(row => row.threadId === threadId);
  if (!current) throw new Error('Demo conversation not found.');
  const message = { ...payload, id: crypto.randomUUID(), from: 'business', at: Date.now() };
  const next = { ...current, conversationMessages: [...(current.conversationMessages || []), message], threadPatch: { ...current.threadPatch, updatedAt: message.at, unread: false, lastMessageFrom: 'business', lastMessagePreview: String(payload.body || 'Attachment').slice(0, 140) } };
  storage(providedStorage).setItem(demoKey(slug), JSON.stringify(rows.map(row => row.id === current.id ? next : row)));
  notify();
  return message;
}

export function updateDemoEnquiry(slug, id, patch, providedStorage) {
  if (!ENQUIRY_STATUSES.some(status => status.id === patch.status) || String(patch.ownerNotes || '').length > 5000) throw new Error('Check the enquiry status and notes.');
  const rows = readDemoEnquiries(slug, providedStorage);
  const current = rows.find(row => row.id === id);
  if (!current) throw new Error('Enquiry not found.');
  if (current.revision !== patch.expectedRevision) throw new Error('This enquiry changed elsewhere. Refresh before saving.');
  const enquiry = { ...current, status: patch.status, ownerNotes: String(patch.ownerNotes || '').trim(), updatedAt: Date.now(), revision: current.revision + 1 };
  storage(providedStorage).setItem(demoKey(slug), JSON.stringify(rows.map(row => row.id === id ? enquiry : row)));
  notify();
  return { ok: true, enquiry };
}
