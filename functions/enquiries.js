import { createHash, randomUUID } from 'node:crypto';
import { getFirestore } from 'firebase-admin/firestore';
import { assertId, assertOwner, domainError } from './workspaceDomain.js';
import { readWorkspace } from './workspaceStore.js';
import { assertPublishedWorkspace } from './commercePolicy.js';
import { isEnquiryListing, getListingType } from './listingTypes.js';
import { isPresenceOnlyBusiness } from './businessCapabilities.js';
import { buildListingEnquiryThread } from './enquiryThread.js';

const APP = process.env.APP_ID || 'book-and-buy-v1';
const hash = value => createHash('sha256').update(value).digest('hex');
const root = ownerId => `artifacts/${APP}/users/${ownerId}`;
const text = (value, max, label, required = false) => {
  if (value !== undefined && typeof value !== 'string') domainError(`${label} is invalid.`);
  const result = String(value || '').trim();
  if (result.length > max || required && !result) domainError(`Enter ${label.toLowerCase()}${required ? '' : ' within the character limit'}.`);
  return result;
};

export function validateEnquiryInput(data = {}) {
  const slug = assertId(data.slug, 'Business address');
  const productId = assertId(data.productId, 'Listing');
  const requestId = assertId(data.requestId, 'Request');
  const customerName = text(data.customerName, 100, 'Your name', true);
  const email = text(data.email, 254, 'Email address', true).toLowerCase();
  const phone = text(data.phone, 32, 'Phone number');
  const message = text(data.message, 3000, 'Message');
  if (customerName.length < 2 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) domainError('Enter your name and a valid email address.');
  if (phone && !/^[+()\d .-]{5,32}$/.test(phone)) domainError('Enter a valid phone number.');
  if (!['enquiry', 'viewing'].includes(data.intent)) domainError('Choose an enquiry or viewing request.');
  return { slug, productId, requestId, customerName, email, phone, message, intent: data.intent };
}

export function assertEnquiryEligible(workspace, productId) {
  if (isPresenceOnlyBusiness(workspace)) domainError('This business currently offers its profile and contact details only.', 'failed-precondition');
  const product = (workspace.products || []).find(row => row.id === productId);
  if (!product || product.active === false || ['draft', 'archived'].includes(product.status) || !isEnquiryListing(product)) domainError('This listing is no longer available for enquiries.', 'failed-precondition');
  if (product.listingAvailability && product.listingAvailability !== 'available') domainError('This listing is no longer available for enquiries.', 'failed-precondition');
  return product;
}

export function consumeEnquiryLimit(current, now, limit, windowMs) {
  const fresh = !current || !Number.isFinite(current.startedAt) || now - current.startedAt >= windowMs;
  const count = fresh ? 0 : Number(current.count) || 0;
  if (count >= limit) domainError('Too many enquiries. Please wait before trying again.', 'resource-exhausted');
  return { startedAt: fresh ? now : current.startedAt, count: count + 1, expiresAt: now + windowMs };
}

/** The live owner catalogue supplies the listing identity and price; guests cannot set them. */
export async function createListingEnquiry(data, context = {}, db = getFirestore()) {
  const input = validateEnquiryInput(data);
  const profileRef = db.doc(`artifacts/${APP}/public/data/workspaces/${input.slug}`);
  const id = randomUUID();
  const now = Date.now();
  const fingerprint = hash(JSON.stringify(input));
  return db.runTransaction(async tx => {
    const published = await tx.get(profileRef);
    const profile = published.data();
    if (!published.exists || profile?.published === false) domainError('Published business not found.', 'not-found');
    const ownerId = assertId(profile.ownerId, 'Business owner');
    const { workspace, exists } = await readWorkspace(db, ownerId, tx);
    if (!exists) domainError('Business unavailable.', 'not-found');
    assertPublishedWorkspace(workspace, profile, input.slug, ownerId);
    const product = assertEnquiryEligible(workspace, input.productId);
    const receiptRef = db.doc(`${root(ownerId)}/idempotencyKeys/enquiry-${input.requestId}`);
    const receipt = await tx.get(receiptRef);
    if (receipt.exists) {
      if (receipt.data().fingerprint !== fingerprint) domainError('This request has changed. Please submit it again.', 'already-exists');
      return { ok: true, id: receipt.data().enquiryId, duplicate: true };
    }
    const source = String(context.ip || context.uid || 'unknown');
    const rateRef = key => db.doc(`artifacts/${APP}/securityRateLimits/listing-${hash(key)}`);
    const rates = [
      { ref: rateRef(`ip:${source}`), limit: 12, windowMs: 30 * 60 * 1000 },
      { ref: rateRef(`email:${ownerId}:${input.email}`), limit: 5, windowMs: 60 * 60 * 1000 },
      { ref: rateRef(`business:${ownerId}`), limit: 200, windowMs: 60 * 60 * 1000 }
    ];
    const rateSnapshots = await Promise.all(rates.map(rate => tx.get(rate.ref)));
    const nextRates = rates.map((rate, index) => consumeEnquiryLimit(rateSnapshots[index].data(), now, rate.limit, rate.windowMs));
    const record = {
      id, threadId: `enquiry-${id}`, ownerId, slug: input.slug, productId: product.id,
      productName: String(product.name || product.title || 'Listing').slice(0, 200),
      listingType: getListingType(product),
      askingPrice: String(product.price ?? '').slice(0, 40),
      currency: String(product.currency || workspace.currency || 'R').slice(0, 8),
      customerName: input.customerName, email: input.email, phone: input.phone,
      message: input.message, intent: input.intent, status: 'new', ownerNotes: '',
      createdAt: now, updatedAt: now, revision: 0
    };
    const { thread, message } = buildListingEnquiryThread(record, workspace);
    const threadRef = db.doc(`artifacts/${APP}/clientThreads/${thread.id}`);
    tx.create(db.doc(`${root(ownerId)}/listingEnquiries/${id}`), record);
    tx.create(threadRef, thread);
    tx.create(threadRef.collection('messages').doc(message.id), message);
    tx.create(receiptRef, { fingerprint, enquiryId: id, createdAt: now });
    rates.forEach((rate, index) => tx.set(rate.ref, nextRates[index]));
    return { ok: true, id };
  });
}

export async function getListingEnquiry(data = {}, auth, db = getFirestore()) {
  const ownerId = data.ownerId || auth?.uid;
  assertOwner(ownerId, auth);
  const snapshot = await db.doc(`${root(ownerId)}/listingEnquiries/${assertId(data.id, 'Enquiry')}`).get();
  if (!snapshot.exists || snapshot.data().ownerId !== ownerId || data.threadId && snapshot.data().threadId !== data.threadId) domainError('Enquiry not found.', 'not-found');
  return { ok: true, enquiry: snapshot.data() };
}

export function validateEnquiryUpdate(data = {}) {
  const id = assertId(data.id, 'Enquiry');
  const requestId = assertId(data.requestId, 'Request');
  if (!['new', 'contacted', 'closed'].includes(data.status)) domainError('Choose a valid enquiry status.');
  if (!Number.isSafeInteger(data.expectedRevision) || data.expectedRevision < 0) domainError('Refresh the enquiry before saving.');
  return { id, requestId, status: data.status, ownerNotes: text(data.ownerNotes, 5000, 'Notes'), expectedRevision: data.expectedRevision };
}

export async function updateListingEnquiry(data = {}, auth, db = getFirestore()) {
  const ownerId = data.ownerId || auth?.uid;
  assertOwner(ownerId, auth);
  const input = validateEnquiryUpdate(data);
  const fingerprint = hash(JSON.stringify(input));
  const ref = db.doc(`${root(ownerId)}/listingEnquiries/${input.id}`);
  const receiptRef = db.doc(`${root(ownerId)}/idempotencyKeys/enquiry-update-${input.requestId}`);
  return db.runTransaction(async tx => {
    const [snapshot, receipt] = await Promise.all([tx.get(ref), tx.get(receiptRef)]);
    if (receipt.exists) {
      if (receipt.data().fingerprint !== fingerprint) domainError('This save request has changed.', 'already-exists');
      return { ok: true, enquiry: receipt.data().enquiry, duplicate: true };
    }
    if (!snapshot.exists || snapshot.data().ownerId !== ownerId) domainError('Enquiry not found.', 'not-found');
    const previous = snapshot.data();
    if ((previous.revision || 0) !== input.expectedRevision) domainError('This enquiry changed elsewhere. Refresh before saving your notes.', 'aborted');
    const enquiry = { ...previous, status: input.status, ownerNotes: input.ownerNotes, revision: input.expectedRevision + 1, updatedAt: Date.now() };
    tx.set(ref, enquiry);
    tx.update(db.doc(`artifacts/${APP}/clientThreads/${previous.threadId}`), { enquiryStatus: input.status });
    tx.create(receiptRef, { fingerprint, enquiry, createdAt: Date.now() });
    return { ok: true, enquiry };
  });
}
