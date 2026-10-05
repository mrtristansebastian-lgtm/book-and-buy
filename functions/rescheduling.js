import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { randomUUID, createHash } from 'node:crypto';
import { availableRescheduleSlots, bookingError, bookingSlot, nextProposal, validateBookingSlot } from './bookingDomain.js';
import { resolveMarket, catalogAllowed } from './marketPolicy.js';
import { verifiedAnalyticsAttribution } from './analyticsAttribution.js';
import { catalogUnitCostCents, paymentConfirmationSnapshot, clientTransactionSnapshot } from './financialSnapshots.js';

const APP_ID = 'book-and-buy-v1';
const safeId = (value) => typeof value === 'string' && /^[a-zA-Z0-9_-]{1,128}$/.test(value);
const requestHash = (value) => createHash('sha256').update(JSON.stringify(value)).digest('hex');
function requireUser(auth) { if (!auth?.uid || !auth.token?.email || auth.token.email_verified !== true) bookingError('Verify your email and sign in to continue.', 'unauthenticated'); }
async function participant(tx, db, auth, ownerId, clientEmail) {
  requireUser(auth);
  if (auth.uid === ownerId) return 'business';
  const access = await tx.get(db.doc(`artifacts/${APP_ID}/staffAccess/${auth.token.email}/workspaces/${ownerId}`));
  if (access.exists && access.data().status === 'active') return 'business';
  if (auth.token.email.toLowerCase() === String(clientEmail).toLowerCase()) return 'client';
  bookingError('You cannot change this booking.', 'permission-denied');
}
async function readContext(tx, db, auth, threadId) {
  if (!safeId(threadId)) bookingError('Invalid conversation.', 'invalid-argument');
  const threadRef = db.doc(`artifacts/${APP_ID}/clientThreads/${threadId}`);
  const threadSnap = await tx.get(threadRef); if (!threadSnap.exists) bookingError('Conversation not found.', 'not-found');
  const thread = threadSnap.data();
  if (!safeId(thread.ownerId) || !safeId(thread.bookingId)) bookingError('Link a booking before requesting a reschedule.');
  const role = await participant(tx, db, auth, thread.ownerId, thread.clientEmail);
  const ownerRoot = `artifacts/${APP_ID}/users/${thread.ownerId}`;
  const settingsRef = db.doc(`${ownerRoot}/config/settings`); const settingsSnap = await tx.get(settingsRef);
  if (!settingsSnap.exists) bookingError('Business settings unavailable.');
  const workspace = settingsSnap.data();
  const booking = (workspace.bookings || []).find((b) => b.id === thread.bookingId);
  if (!booking || String(booking.clientEmail).toLowerCase() !== String(thread.clientEmail).toLowerCase()) bookingError('The linked booking does not belong to this conversation.', 'permission-denied');
  if (!['pending', 'confirmed'].includes(booking.status)) bookingError('Only active bookings can be rescheduled.');
  const proposalRef = db.doc(`${ownerRoot}/rescheduleProposals/${booking.id}`); const proposalSnap = await tx.get(proposalRef);
  return { threadRef, thread, role, ownerRoot, settingsRef, workspace, booking, proposalRef, current: proposalSnap.exists ? proposalSnap.data() : null };
}
export async function getRescheduleContext(data, auth, db = getFirestore()) {
  return db.runTransaction(async (tx) => {
    const context = await readContext(tx, db, auth, data.threadId);
    const { workspace, booking, current, role } = context;
    const day = data.dateKey || booking.dateKey || booking.date;
    return { booking: role === 'client' ? clientTransactionSnapshot(booking) : booking, proposal: current, timezone: workspace.timezone || 'UTC', role, slots: availableRescheduleSlots(workspace, booking, day, workspace.bookings || []), clientAllowed: workspace.availabilityRules?.reschedulingAllowed !== false };
  });
}
export async function respondToReschedule(data, auth, db = getFirestore()) {
  const { action, threadId, expectedRevision = 0, requestId, slot, note } = data;
  if (!safeId(requestId) || !['propose', 'counter', 'accept', 'decline', 'withdraw'].includes(action)) bookingError('Invalid proposal request.', 'invalid-argument');
  if ((slot && (typeof slot !== 'object' || Object.keys(slot).some((key) => !['dateKey', 'time', 'scheduleSessionId'].includes(key)))) || (note !== undefined && (typeof note !== 'string' || note.length > 500))) bookingError('Invalid proposal fields.', 'invalid-argument');
  const fingerprint = requestHash({ threadId, action, expectedRevision, slot: slot || null, note: note || '' });
  return db.runTransaction(async (tx) => {
    const context = await readContext(tx, db, auth, threadId);
    const { booking, workspace, current, role, proposalRef, settingsRef, ownerRoot, threadRef, thread } = context;
    if (role === 'client' && workspace.availabilityRules?.reschedulingAllowed === false && ['propose', 'counter'].includes(action)) bookingError('This business does not allow client reschedule requests.');
    const receiptRef = db.doc(`${ownerRoot}/idempotencyKeys/reschedule-${requestId}`); const receipt = await tx.get(receiptRef);
    if (receipt.exists) { const value = receipt.data(); if (value.uid !== auth.uid || value.fingerprint !== fingerprint) bookingError('Request ID already used.', 'already-exists'); return value.result; }
    const proposal = nextProposal({ current, booking, actor: role, action, slot, note, expectedRevision, id: booking.id });
    if (['propose', 'counter', 'accept'].includes(action)) validateBookingSlot(workspace, booking, proposal.proposed, workspace.bookings || []);
    const now = Date.now(); const timestamp = FieldValue.serverTimestamp();
    if (action === 'accept') {
      const nextBooking = { ...booking, date: proposal.proposed.dateKey, dateKey: proposal.proposed.dateKey, time: proposal.proposed.time, scheduleSessionId: proposal.proposed.scheduleSessionId || booking.scheduleSessionId || '', revision: (booking.revision || 0) + 1, updatedAt: now };
      const bookings = workspace.bookings.map((b) => b.id === booking.id ? nextBooking : b);
      // This shared settings document is also the transaction guard for all booking writes.
      tx.update(settingsRef, { bookings, bookingRevision: (workspace.bookingRevision || 0) + 1 });
      tx.set(db.doc(`${ownerRoot}/bookings/${booking.id}`), { ...nextBooking, ownerId: thread.ownerId, serverUpdatedAt: timestamp });
      tx.set(db.doc(`artifacts/${APP_ID}/clientAccess/${thread.clientEmail}/bookings/${booking.id}`), { ...clientTransactionSnapshot(nextBooking), ownerId: thread.ownerId, serverUpdatedAt: timestamp });
      tx.set(db.doc(`${ownerRoot}/notifications/reschedule-${requestId}`), { type: 'reschedule', audience: 'owner', ownerId: thread.ownerId, clientEmail: thread.clientEmail, bookingId: booking.id, body: `Booking rescheduled · ${booking.serviceName}`, read: false, createdAt: now });
      tx.set(db.doc(`artifacts/${APP_ID}/clientAccess/${thread.clientEmail}/notifications/reschedule-${requestId}`), { type: 'reschedule', audience: 'client', ownerId: thread.ownerId, clientEmail: thread.clientEmail, bookingId: booking.id, body: `New booking time · ${proposal.proposed.dateKey} ${proposal.proposed.time}`, read: false, createdAt: now });
    }
    const label = { propose: 'Reschedule proposed', counter: 'New time suggested', accept: 'Reschedule accepted', decline: 'Reschedule declined', withdraw: 'Reschedule withdrawn' }[action];
    tx.set(proposalRef, { ...proposal, ownerId: thread.ownerId, clientEmail: thread.clientEmail, threadId, serviceName: booking.serviceName, timezone: workspace.timezone || 'UTC', serverUpdatedAt: timestamp });
    tx.set(threadRef.collection('messages').doc(`reschedule-${requestId}`), { type: 'reschedule', from: role, body: label, at: now, proposal: { ...proposal, serviceName: booking.serviceName, timezone: workspace.timezone || 'UTC' }, serverCreatedAt: timestamp });
    tx.update(threadRef, { updatedAt: now, lastMessageAt: now, lastMessagePreview: label, unread: role === 'client', unreadForClient: role === 'business' });
    const result = { ok: true, proposal: { ...proposal, serviceName: booking.serviceName, timezone: workspace.timezone || 'UTC' } };
    tx.set(receiptRef, { uid: auth.uid, threadId, action, fingerprint, result, createdAt: timestamp });
    return result;
  });
}

export async function writeGuardedBooking(data, auth, db = getFirestore(), publicRequest = false) {
  let ownerId = data.ownerId; let published;
  if (publicRequest) { if (!safeId(data.slug)) bookingError('Invalid business.', 'invalid-argument'); published = await db.doc(`artifacts/${APP_ID}/public/data/workspaces/${data.slug}`).get(); if (!published.exists) bookingError('Business not found.', 'not-found'); ownerId = published.data().ownerId; }
  if (!safeId(ownerId)) bookingError('Invalid business.', 'invalid-argument');
  const input = publicRequest ? data : data.booking;
  if (!input || typeof input !== 'object') bookingError('Invalid booking.', 'invalid-argument');
  if (publicRequest && !safeId(data.requestId)) bookingError('A booking request identifier is required.', 'invalid-argument');
  const id = !publicRequest && safeId(input.id) ? input.id : randomUUID();
  return db.runTransaction(async (tx) => {
    const settingsRef = db.doc(`artifacts/${APP_ID}/users/${ownerId}/config/settings`); const snap = await tx.get(settingsRef); if (!snap.exists) bookingError('Business unavailable.');
    const workspace = snap.data();
    const receiptRef = publicRequest ? db.doc(`artifacts/${APP_ID}/users/${ownerId}/idempotencyKeys/booking-${data.requestId}`) : null;
    const fingerprint = publicRequest ? requestHash(data) : null;
    if (receiptRef) { const receipt = await tx.get(receiptRef); if (receipt.exists) { if (receipt.data().fingerprint !== fingerprint) bookingError('Request ID already used.', 'already-exists'); return clientTransactionSnapshot(receipt.data().booking); } }
    if (!publicRequest && await participant(tx, db, auth, ownerId, '') !== 'business') bookingError('Business access required.', 'permission-denied');
    const old = (workspace.bookings || []).find((b) => b.id === id);
    if (old && data.expectedRevision !== (old.revision || 0)) bookingError('This booking changed. Refresh before editing.', 'aborted');
    const allowed = ['serviceId', 'serviceName', 'date', 'dateKey', 'time', 'durationMinutes', 'scheduleType', 'scheduleSessionId', 'sessionEndDate', 'sessionEndTime', 'staffId', 'staffName', 'clientName', 'clientEmail', 'clientPhone', 'clientUid', 'clientNote', 'clientCountry', 'clientBirthday', 'partySize', 'variantId', 'variantName', 'paymentMethod', 'currency', 'amountInCents', 'status', 'paymentStatus', 'source'];
    const patch = Object.fromEntries(Object.entries(input).filter(([key, value]) => allowed.includes(key) && value !== undefined));
    const service = (workspace.services || []).find((s) => s.id === (old?.serviceId || patch.serviceId)); if (!service) bookingError('Service unavailable.');
    const booking = { ...(old || {}), ...patch, id, ownerId, serviceName: old?.serviceName || service.name, status: publicRequest ? 'pending' : patch.status || old?.status || 'pending', paymentStatus: publicRequest ? 'unpaid' : patch.paymentStatus || old?.paymentStatus || 'unpaid', revision: (old?.revision || 0) + 1, updatedAt: Date.now(), timestamp: old?.timestamp || Date.now() };
    if (!old) {
      const variant = booking.variantId ? (service.variants || []).find((item) => item.id === booking.variantId) : null;
      const costBasisInCents = catalogUnitCostCents(service, variant);
      if (costBasisInCents != null) booking.costBasisInCents = costBasisInCents;
      // Manual bookings need a receipt price too; don't use a future catalog
      // price as a substitute for what this booking originally cost.
      if (!publicRequest && booking.amountInCents == null) {
        const configuredPrice = String(variant?.price ?? service.price ?? '').trim();
        const priceInCents = ['quote', 'free'].includes(service.priceType) ? 0 : configuredPrice ? Math.round(Number(configuredPrice.replace(/[^\d.]/g, '')) * 100) : null;
        if (Number.isSafeInteger(priceInCents) && priceInCents >= 0) booking.amountInCents = priceInCents;
      }
      booking.currency = booking.currency || workspace.currency || 'R';
    }
    if (!publicRequest && booking.paymentStatus === 'paid') Object.assign(booking, paymentConfirmationSnapshot({ ...booking, paymentStatus: old?.paymentStatus || 'unpaid' }));
    if (publicRequest) {
      if (Array.isArray(workspace.website?.markets) && (!/^[A-Z]{2}$/.test(booking.clientCountry || '') || !catalogAllowed(resolveMarket(workspace.website, booking.clientCountry), 'service', service.id))) bookingError('This service is not available in the selected country.');
      if (service.active === false || service.available === false) bookingError('Service unavailable.');
      const variant = booking.variantId ? (service.variants || []).find((item) => item.id === booking.variantId && item.available !== false) : null;
      if (booking.variantId && !variant) bookingError('That service option is unavailable.');
      if (!booking.clientEmail || !/^[^\s/@]+@[^\s/@]+\.[^\s/@]+$/.test(booking.clientEmail) || !String(booking.clientName || '').trim()) bookingError('Enter a valid client name and email.');
      if (booking.staffId && !(service.staffIds || []).includes(booking.staffId)) bookingError('Choose an available staff member.');
      if (booking.partySize != null && (!Number.isInteger(booking.partySize) || booking.partySize < 1 || booking.partySize > 100)) bookingError('Invalid party size.');
      booking.clientUid = auth?.token?.email === booking.clientEmail ? auth.uid : '';
      booking.scheduleType = service.scheduleType || 'appointment';
      booking.durationMinutes = Number(service.durationMinutes) || Number(String(variant?.minDuration || service.minDuration || service.duration || '60').replace(/[^\d.]/g, '')) || 60;
      if (booking.scheduleType === 'class_session') { const elapsed = Date.parse(`${service.sessionEndDate || service.sessionStartDate}T${service.sessionEndTime}:00Z`) - Date.parse(`${service.sessionStartDate}T${service.sessionStartTime}:00Z`); booking.durationMinutes = elapsed > 0 ? elapsed / 60000 : 60; }
      booking.amountInCents = ['quote', 'free'].includes(service.priceType) ? 0 : Math.round(Number(String(variant?.price ?? service.price ?? '').replace(/[^\d.]/g, '')) * 100) || 0;
      booking.variantName = variant?.name || ''; booking.currency = workspace.currency || 'R'; booking.source = 'public';
      Object.assign(booking, await verifiedAnalyticsAttribution(data, ownerId, data.slug, async (sessionId) => {
        const session = await tx.get(db.doc(`artifacts/${APP_ID}/analyticsSessions/${sessionId}`));
        return session.exists ? session.data() : null;
      }));
    }
    if (['pending', 'confirmed'].includes(booking.status) && (!old || old.date !== booking.date || old.time !== booking.time || old.staffId !== booking.staffId || old.status !== booking.status)) validateBookingSlot(workspace, booking, bookingSlot(booking), workspace.bookings || []);
    const bookings = old ? workspace.bookings.map((b) => b.id === id ? booking : b) : [...(workspace.bookings || []), booking];
    tx.update(settingsRef, { bookings, bookingRevision: (workspace.bookingRevision || 0) + 1 });
    tx.set(db.doc(`artifacts/${APP_ID}/users/${ownerId}/bookings/${id}`), booking);
    if (booking.clientEmail && !booking.clientEmail.includes('/')) tx.set(db.doc(`artifacts/${APP_ID}/clientAccess/${booking.clientEmail}/bookings/${id}`), clientTransactionSnapshot(booking));
    if (receiptRef) tx.set(receiptRef, { fingerprint, booking, createdAt: FieldValue.serverTimestamp() });
    return publicRequest ? clientTransactionSnapshot(booking) : booking;
  });
}
