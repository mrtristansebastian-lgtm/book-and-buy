const admin = require('firebase-admin');
const { onCall, HttpsError } = require('firebase-functions/v2/https');
const { onDocumentCreated, onDocumentWritten } = require('firebase-functions/v2/firestore');
const { onSchedule } = require('firebase-functions/v2/scheduler');
const { defineSecret } = require('firebase-functions/params');
const {
  bookingBlocksAvailability,
  getLockBucketIds,
  getServiceAvailabilityModel,
  normalizeAvailabilityRules,
  parseDurationMinutes,
  timeToMinutes
} = require('./availability');
const {
  alignBookingWithWorkspace,
  assertRateLimit,
  validateAvailabilityLookupPayload,
  validatePublicBookingPayload
} = require('./security');
const {
  getCachedAvailabilityBookings,
  getCachedAvailabilityBookingsInTransaction,
  syncBookingAvailabilityHold
} = require('./availabilityCache');
const {
  backfillWorkspaceScaleCollections
} = require('./scaleCollections');
const { cappedMaxInstances } = require('./runtimeOptions');
const {
  buildClientBookingEmail,
  buildOwnerBookingRequestEmail,
  buildPasswordResetEmail,
  buildVerificationEmail,
  getEmailProviderStatus,
  getEmailRuntimeConfig,
  normalizeEmail: normalizeEmailAddress,
  sendEmail
} = require('./emailService');

admin.initializeApp();

const db = admin.firestore();
const serverTimestamp = () => admin.firestore.FieldValue.serverTimestamp();
const RESEND_API_KEY = defineSecret('RESEND_API_KEY');
const DEFAULT_APP_ID = process.env.BUILD_A_BOOKING_APP_ID || 'build-a-booking-v2';
const REMINDER_UTC_OFFSET = process.env.BOOKING_REMINDER_UTC_OFFSET || '+02:00';
const REMINDER_TIME_ZONE = process.env.BOOKING_REMINDER_TIME_ZONE || 'Africa/Johannesburg';
const REMINDER_WINDOW_BEHIND_MS = 30 * 60 * 1000;
const REMINDER_WINDOW_AHEAD_MS = 15 * 60 * 1000;
const ENFORCE_APP_CHECK = process.env.BUILD_A_BOOKING_ENFORCE_APP_CHECK === 'true';
const SLOT_LOCK_TTL_MS = 30 * 24 * 60 * 60 * 1000;
const IDEMPOTENCY_TTL_MS = 24 * 60 * 60 * 1000;
const publicCallableOptions = {
  region: 'us-central1',
  timeoutSeconds: 30,
  memory: '512MiB',
  concurrency: 40,
  maxInstances: cappedMaxInstances(process.env.BUILD_A_BOOKING_PUBLIC_MAX_INSTANCES, 2),
  ...(ENFORCE_APP_CHECK ? { enforceAppCheck: true } : {})
};
const bookingCallableOptions = {
  ...publicCallableOptions,
  concurrency: 10,
  maxInstances: cappedMaxInstances(process.env.BUILD_A_BOOKING_BOOKING_MAX_INSTANCES, 2)
};
const workerFunctionOptions = {
  region: 'us-central1',
  maxInstances: 1
};
const emailCallableOptions = {
  ...publicCallableOptions,
  timeoutSeconds: 30,
  maxInstances: cappedMaxInstances(process.env.BUILD_A_BOOKING_EMAIL_MAX_INSTANCES, 2),
  secrets: [RESEND_API_KEY]
};
const emailWorkerFunctionOptions = {
  ...workerFunctionOptions,
  timeoutSeconds: 30,
  secrets: [RESEND_API_KEY]
};

const cleanString = (value, max = 240) => (
  String(value || '').trim().slice(0, max)
);

const requireString = (value, label, max = 240) => {
  const next = cleanString(value, max);
  if (!next) throw new HttpsError('invalid-argument', `${label} is required.`);
  return next;
};

const safeLockId = (dateKey, time) => (
  `${cleanString(dateKey, 32)}_${cleanString(time, 32)}`
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 120)
);

const safeDocumentId = (value, max = 180) => (
  cleanString(value, max)
    .replace(/[^a-zA-Z0-9@._:-]/g, '-')
    .slice(0, max) || `id-${Date.now()}`
);

const safeThreadId = (ownerId, bookingId) => (
  `${cleanString(ownerId, 80)}_${cleanString(bookingId, 80)}`
    .replace(/[^a-zA-Z0-9_-]/g, '-')
    .slice(0, 160)
);

const normalizeEmail = (email = '') => cleanString(email, 180).toLowerCase();

const isValidEmail = (email = '') => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));

const getAuthActionSettings = (mode = 'auth') => {
  const { baseUrl } = getEmailRuntimeConfig({ resendApiKeySecret: RESEND_API_KEY });
  return {
    url: `${baseUrl}/#/auth/action?intent=${encodeURIComponent(mode)}`,
    handleCodeInApp: false
  };
};

const authEmailRateLimit = async ({ request, email }) => {
  await assertRateLimit({
    db,
    appId: DEFAULT_APP_ID,
    workspaceSlug: 'auth-email',
    action: 'auth_email',
    request,
    subject: normalizeEmail(email)
  });
};

const assertVerifiedPasswordAccount = (request) => {
  const signInProvider = request.auth?.token?.firebase?.sign_in_provider || '';
  if (signInProvider === 'password' && request.auth?.token?.email_verified !== true) {
    throw new HttpsError('permission-denied', 'Verify your email before using this workspace.');
  }
};

const readOwnerWorkspaceEmailContext = async ({ appId, ownerId }) => {
  const [settingsSnap, communicationsSnap, accountSnap] = await Promise.all([
    db.collection('artifacts').doc(appId).collection('users').doc(ownerId).collection('config').doc('settings').get(),
    db.collection('artifacts').doc(appId).collection('users').doc(ownerId).collection('config').doc('communications').get(),
    db.collection('artifacts').doc(appId).collection('accounts').doc(ownerId).get()
  ]);
  return {
    settings: settingsSnap.exists ? (settingsSnap.data() || {}) : {},
    communications: communicationsSnap.exists ? (communicationsSnap.data() || {}) : {},
    account: accountSnap.exists ? (accountSnap.data() || {}) : {}
  };
};

const getOwnerEmail = async ({ ownerId, account = {} }) => {
  const accountEmail = normalizeEmail(account.email || account.personalProfile?.email || '');
  if (accountEmail) return accountEmail;
  try {
    const userRecord = await admin.auth().getUser(ownerId);
    return normalizeEmail(userRecord.email || '');
  } catch {
    return '';
  }
};

const getEmailChannelEnabled = (communications = {}, key, fallback = true) => {
  const channels = communications.emailNotifications || communications.emailChannels || {};
  if (typeof channels[key] === 'boolean') return channels[key];
  return fallback;
};

const sendClientBookingEmail = async ({
  appId,
  ownerId,
  booking,
  communications,
  settings,
  templateKey,
  extra = {}
}) => {
  if (!normalizeEmail(booking.clientEmail)) {
    return { ok: false, skipped: true, reason: 'Missing client email.' };
  }
  const requiresConsent = !['reminder24h', 'reminder2h'].includes(templateKey);
  if (requiresConsent && booking.notificationChannels?.email === false) {
    return { ok: false, skipped: true, reason: 'Client email updates are off for this booking.' };
  }
  const emailChannelKey = ['reminder24h', 'reminder2h'].includes(templateKey) ? 'reminders' : 'bookingUpdates';
  if (!getEmailChannelEnabled(communications, emailChannelKey, true)) {
    return { ok: false, skipped: true, reason: 'This email channel is turned off.' };
  }
  const { baseUrl } = getEmailRuntimeConfig({ resendApiKeySecret: RESEND_API_KEY });
  const email = buildClientBookingEmail({
    booking,
    communications,
    settings,
    templateKey,
    extra,
    baseUrl
  });
  if (email.skipped) return { ok: false, skipped: true, reason: email.reason };
  return sendEmail({
    resendApiKeySecret: RESEND_API_KEY,
    to: booking.clientEmail,
    subject: email.subject,
    html: email.html,
    text: email.text,
    replyTo: settings.replyToEmail || settings.email || ''
  }).then(result => ({
    ...result,
    appId,
    ownerId,
    templateKey
  }));
};

const dateKeyInTimeZone = (date = new Date(), timeZone = REMINDER_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date).reduce((acc, part) => {
    if (part.type !== 'literal') acc[part.type] = part.value;
    return acc;
  }, {});
  return `${parts.year}-${parts.month}-${parts.day}`;
};

const addDaysToDateKey = (dateKey, days) => {
  const date = new Date(`${dateKey}T00:00:00${REMINDER_UTC_OFFSET}`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

const bookingStartMs = (booking = {}) => {
  const dateKey = cleanString(booking.dateKey, 32);
  const match = cleanString(booking.time, 80).match(/(\d{1,2}):(\d{2})/);
  if (!dateKey || !match) return 0;
  const hour = String(Math.min(23, Math.max(0, Number(match[1])))).padStart(2, '0');
  const minute = String(Math.min(59, Math.max(0, Number(match[2])))).padStart(2, '0');
  const parsed = Date.parse(`${dateKey}T${hour}:${minute}:00${REMINDER_UTC_OFFSET}`);
  return Number.isFinite(parsed) ? parsed : 0;
};

const reminderIsDue = ({ booking, nowMs, offsetMs }) => {
  const targetMs = bookingStartMs(booking) - offsetMs;
  return targetMs > 0 &&
    targetMs >= nowMs - REMINDER_WINDOW_BEHIND_MS &&
    targetMs <= nowMs + REMINDER_WINDOW_AHEAD_MS;
};

const getExpirationFields = (ttlMs) => {
  const expiresAtMs = Date.now() + ttlMs;
  return {
    expiresAtMs,
    expiresAt: admin.firestore.Timestamp.fromMillis(expiresAtMs)
  };
};

const getLegacyDateBookings = async ({ appId, ownerId, dateKey, transaction = null }) => {
  const query = db
    .collection('artifacts').doc(appId)
    .collection('users').doc(ownerId)
    .collection('bookings')
    .where('dateKey', '==', dateKey)
    .limit(500);
  const snap = transaction ? await transaction.get(query) : await query.get();
  return snap.docs.map(doc => doc.data() || {});
};

const getAvailabilityBookingsForDate = async ({ appId, ownerId, dateKey }) => {
  const cached = await getCachedAvailabilityBookings({ db, appId, ownerId, dateKey });
  if (cached.length) return cached;
  return getLegacyDateBookings({ appId, ownerId, dateKey });
};

const getAvailabilityBookingsForDateInTransaction = async ({ transaction, appId, ownerId, dateKey }) => {
  const cached = await getCachedAvailabilityBookingsInTransaction({ transaction, db, appId, ownerId, dateKey });
  if (cached.length) return cached;
  return getLegacyDateBookings({ appId, ownerId, dateKey, transaction });
};

const getReminderQueueRef = ({ appId, reminderKey, bookingId }) => (
  db
    .collection('artifacts').doc(appId)
    .collection('reminderQueue').doc(`reminder-${reminderKey}-${bookingId}`)
);

const enqueueReminderJob = async ({ appId, ownerId, bookingId, booking, reminderKey, dueAtMs, title, body }) => {
  if (!Number.isFinite(dueAtMs) || dueAtMs <= Date.now() - REMINDER_WINDOW_BEHIND_MS) return;
  const reminderRef = getReminderQueueRef({ appId, reminderKey, bookingId });
  const existing = await reminderRef.get();
  if (existing.exists && existing.data()?.status === 'sent') return;
  await reminderRef.set({
    appId,
    ownerId,
    bookingId,
    reminderKey,
    title,
    body,
    clientEmail: normalizeEmail(booking.clientEmail),
    workspaceName: booking.workspaceName || '',
    dateKey: booking.dateKey || '',
    time: booking.time || '',
    dueAtMs,
    dueAt: admin.firestore.Timestamp.fromMillis(dueAtMs),
    status: 'queued',
    attempts: Number(existing.data()?.attempts || 0),
    updatedAtMs: Date.now(),
    createdAtMs: existing.data()?.createdAtMs || Date.now(),
    updatedAt: serverTimestamp(),
    createdAt: existing.data()?.createdAt || serverTimestamp(),
    ...getExpirationFields(14 * 24 * 60 * 60 * 1000)
  }, { merge: true });
};

const cancelReminderJobs = async ({ appId, bookingId, reason = 'booking-not-confirmed' }) => {
  const batch = db.batch();
  ['24h', '2h'].forEach((reminderKey) => {
    batch.set(getReminderQueueRef({ appId, reminderKey, bookingId }), {
      status: 'cancelled',
      cancelledReason: reason,
      updatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
      ...getExpirationFields(7 * 24 * 60 * 60 * 1000)
    }, { merge: true });
  });
  await batch.commit();
};

const enqueueBookingReminderJobs = async ({ appId, ownerId, bookingId, booking = {} }) => {
  if (booking.status !== 'confirmed' || !normalizeEmail(booking.clientEmail) || !booking.dateKey || !booking.time) {
    return;
  }
  const settingsSnap = await db
    .collection('artifacts').doc(appId)
    .collection('users').doc(ownerId)
    .collection('config').doc('settings')
    .get();
  const settings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
  const reminders = {
    enabled: true,
    client24h: true,
    client2h: true,
    ...(settings.reminders || {})
  };
  if (reminders.enabled === false || (!reminders.client24h && !reminders.client2h)) {
    await cancelReminderJobs({ appId, bookingId, reason: 'reminders-disabled' });
    return;
  }

  const startMs = bookingStartMs(booking);
  if (!startMs) return;
  const workspaceName = booking.workspaceName || settings.brandName || 'The business';
  const serviceText = booking.serviceName ? ` for ${booking.serviceName}` : '';
  if (reminders.client24h) {
    await enqueueReminderJob({
      appId,
      ownerId,
      bookingId,
      booking,
      reminderKey: '24h',
      dueAtMs: startMs - (24 * 60 * 60 * 1000),
      title: 'Your booking is tomorrow',
      body: `${workspaceName} has your booking${serviceText} tomorrow at ${booking.time}. Open your portal for details.`
    });
  }
  if (reminders.client2h) {
    await enqueueReminderJob({
      appId,
      ownerId,
      bookingId,
      booking,
      reminderKey: '2h',
      dueAtMs: startMs - (2 * 60 * 60 * 1000),
      title: 'Your booking is coming up soon',
      body: `${workspaceName} has your booking${serviceText} coming up at ${booking.date || booking.dateKey} at ${booking.time}. Open your portal if you need to message or reschedule.`
    });
  }
};

const backfillAvailabilityHoldsForWorkspace = async ({ appId, ownerId }) => {
  const todayKey = dateKeyInTimeZone(new Date());
  const bookingsSnap = await db
    .collection('artifacts').doc(appId)
    .collection('users').doc(ownerId)
    .collection('bookings')
    .where('dateKey', '>=', todayKey)
    .limit(1000)
    .get();
  for (const bookingDoc of bookingsSnap.docs) {
    await syncBookingAvailabilityHold({
      admin,
      db,
      appId,
      ownerId,
      bookingId: bookingDoc.id,
      after: bookingDoc.data() || {}
    });
  }
  return bookingsSnap.size;
};

const timestampValue = (value) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (value?.toMillis) return value.toMillis();
  if (typeof value?.seconds === 'number') return value.seconds * 1000;
  const parsed = new Date(value || 0).getTime();
  return Number.isFinite(parsed) && parsed > 0 ? parsed : Date.now();
};

const backfillThreadTimestampsForWorkspace = async ({ appId, ownerId }) => {
  const threadsSnap = await db
    .collection('artifacts').doc(appId)
    .collection('clientThreads')
    .where('ownerId', '==', ownerId)
    .limit(500)
    .get();
  let updated = 0;
  const batch = db.batch();
  threadsSnap.docs.forEach((threadDoc) => {
    const thread = threadDoc.data() || {};
    if (thread.updatedAtMs && thread.lastMessageAtMs && thread.createdAtMs) return;
    const updatedAtMs = timestampValue(thread.updatedAt || thread.lastMessageAt || thread.createdAt);
    batch.set(threadDoc.ref, {
      updatedAtMs,
      lastMessageAtMs: thread.lastMessageAtMs || timestampValue(thread.lastMessageAt || thread.updatedAt || thread.createdAt),
      createdAtMs: thread.createdAtMs || timestampValue(thread.createdAt || thread.updatedAt || thread.lastMessageAt)
    }, { merge: true });
    updated += 1;
  });
  if (updated) await batch.commit();
  return updated;
};

const assertCanWriteOwnerBooking = async ({ appId, ownerId, request }) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in before creating owner bookings.');
  }
  assertVerifiedPasswordAccount(request);
  if (request.auth.uid === ownerId) return { role: 'owner', staffId: 'owner' };

  const emailKey = normalizeEmail(request.auth.token?.email || '');
  if (!emailKey) {
    throw new HttpsError('permission-denied', 'This account is missing a verified workspace email.');
  }
  const grantSnap = await db
    .collection('artifacts').doc(appId)
    .collection('staffAccess').doc(emailKey)
    .collection('workspaces').doc(ownerId)
    .get();
  const grant = grantSnap.exists ? (grantSnap.data() || {}) : {};
  if (grant.status !== 'active') {
    throw new HttpsError('permission-denied', 'This account cannot create bookings for this workspace.');
  }
  return {
    role: grant.role || 'staff',
    staffId: cleanString(grant.staffId || '', 120)
  };
};

const normalizeOwnerStaffRows = (rows = []) => {
  const normalized = (Array.isArray(rows) ? rows : [])
    .filter(staff => staff?.id && staff.accessEnabled !== false)
    .map((staff, index) => ({
      id: cleanString(staff.id, 120),
      name: cleanString(staff.name || staff.displayName || 'Team member', 120),
      color: cleanString(staff.color || '#111827', 40),
      photoURL: cleanString(staff.photoURL || '', 500),
      sortOrder: Number.isFinite(Number(staff.sortOrder)) ? Number(staff.sortOrder) : index
    }))
    .filter((staff, index, list) => staff.id && list.findIndex(item => item.id === staff.id) === index)
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return normalized.length ? normalized : [{ id: 'owner', name: 'Owner', color: '#111827', photoURL: '', sortOrder: 0 }];
};

const getCollectionRows = async ({ collectionRef, orderField = 'sortOrder', limit = 300 }) => {
  try {
    const snap = await collectionRef.orderBy(orderField, 'asc').limit(limit).get();
    return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  } catch (error) {
    console.error(`Collection row load failed for ${collectionRef.path}`, error);
    return [];
  }
};

const getOwnerBookingWorkspace = async ({ appId, ownerId }) => {
  const userRef = db.collection('artifacts').doc(appId).collection('users').doc(ownerId);
  const [settingsSnap, staffSnap, servicesRows, staffRows] = await Promise.all([
    userRef.collection('config').doc('settings').get(),
    userRef.collection('config').doc('staff').get(),
    getCollectionRows({ collectionRef: userRef.collection('services'), limit: 300 }),
    getCollectionRows({ collectionRef: userRef.collection('staff'), limit: 200 })
  ]);
  const settings = settingsSnap.exists ? (settingsSnap.data() || {}) : {};
  const legacyStaff = Array.isArray(staffSnap.data()?.list) ? staffSnap.data().list : [];
  const publicStaff = normalizeOwnerStaffRows(staffRows.length ? staffRows : legacyStaff);
  return {
    ...settings,
    ownerId,
    services: servicesRows.length ? servicesRows : (Array.isArray(settings.services) ? settings.services : []),
    publicStaff,
    workspaceName: settings.workspaceName || settings.brandName || 'Build A Booking Workspace'
  };
};

const validateOwnerBookingPayload = (incoming = {}) => {
  if (!incoming || typeof incoming !== 'object' || Array.isArray(incoming)) {
    throw new HttpsError('invalid-argument', 'Booking must be an object.');
  }
  const status = cleanString(incoming.status || 'confirmed', 40).toLowerCase();
  const dateKey = cleanString(incoming.dateKey, 32);
  const time = requireString(incoming.time, 'Booking time', 80);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    throw new HttpsError('invalid-argument', 'Booking date is invalid.');
  }
  if (time !== 'Waitlist' && !/^([01]?\d|2[0-3]):[0-5]\d(?:\s*(?:-|to)\s*([01]?\d|2[0-3]):[0-5]\d)?$/i.test(time)) {
    throw new HttpsError('invalid-argument', 'Booking time is invalid.');
  }

  const amountInCents = Number(incoming.amountInCents || incoming.amountPaidInCents || 0);
  const timestamp = Number(incoming.timestamp || Date.now());
  return {
    clientName: requireString(incoming.clientName, 'Client name', 120),
    clientPhone: cleanString(incoming.clientPhone, 60),
    clientEmail: normalizeEmail(incoming.clientEmail),
    clientBirthday: cleanString(incoming.clientBirthday, 80),
    clientNote: cleanString(incoming.clientNote, 1000),
    clientEmailOptIn: Boolean(incoming.clientEmailOptIn && incoming.clientEmail),
    serviceId: cleanString(incoming.serviceId, 120),
    serviceName: cleanString(incoming.serviceName, 180),
    serviceDescription: cleanString(incoming.serviceDescription, 700),
    servicePrice: cleanString(incoming.servicePrice, 80),
    servicePriceType: cleanString(incoming.servicePriceType, 40),
    serviceDuration: cleanString(incoming.serviceDuration, 80),
    serviceCategory: cleanString(incoming.serviceCategory, 120),
    amountInCents: Number.isFinite(amountInCents) ? Math.max(0, Math.round(amountInCents)) : 0,
    currency: cleanString(incoming.currency || 'ZAR', 12).toUpperCase(),
    staffId: cleanString(incoming.staffId, 120),
    staffName: cleanString(incoming.staffName, 120),
    staffPhotoURL: cleanString(incoming.staffPhotoURL, 500),
    paymentMethod: cleanString(incoming.paymentMethod, 60).toLowerCase(),
    paymentGateway: cleanString(incoming.paymentGateway || incoming.paymentMethod, 60).toLowerCase(),
    paymentProviderName: cleanString(incoming.paymentProviderName, 120),
    paymentStatus: cleanString(incoming.paymentStatus || (incoming.paymentMethod ? 'manual_pending' : 'unpaid'), 60).toLowerCase(),
    paymentReference: cleanString(incoming.paymentReference, 180),
    notificationChannels: {
      email: Boolean(incoming.notificationChannels?.email || incoming.clientEmailOptIn),
      portal: Boolean(incoming.notificationChannels?.portal || incoming.clientEmail)
    },
    date: requireString(incoming.date, 'Booking date label', 120),
    dateKey,
    time,
    status: status || 'confirmed',
    noShowHistory: Boolean(incoming.noShowHistory),
    source: cleanString(incoming.source || 'manual-owner', 120),
    threadId: cleanString(incoming.threadId, 160),
    timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
    createdAt: Number.isFinite(Number(incoming.createdAt)) ? Number(incoming.createdAt) : serverTimestamp(),
    updatedAt: Number.isFinite(Number(incoming.updatedAt)) ? Number(incoming.updatedAt) : serverTimestamp()
  };
};

const applyWorkspaceDefaultsToOwnerBooking = ({ booking, workspace }) => {
  const service = (workspace.services || []).find(item => cleanString(item.id, 120) === booking.serviceId) || null;
  const staff = (workspace.publicStaff || []).find(item => item.id === booking.staffId) || null;
  return {
    ...booking,
    serviceName: booking.serviceName || service?.name || '',
    serviceDescription: booking.serviceDescription || service?.description || '',
    servicePrice: booking.servicePrice || service?.price || '',
    servicePriceType: booking.servicePriceType || service?.priceType || '',
    serviceDuration: booking.serviceDuration || service?.duration || '',
    serviceCategory: booking.serviceCategory || service?.category || '',
    staffName: booking.staffName || staff?.name || '',
    staffPhotoURL: booking.staffPhotoURL || staff?.photoURL || '',
    serviceDurationMinutes: parseDurationMinutes(booking.serviceDuration || service?.duration || '', normalizeAvailabilityRules(workspace).fallbackDurationMinutes),
    workspaceSlug: workspace.slug || '',
    workspaceName: workspace.workspaceName || workspace.brandName || 'Build A Booking Workspace',
    workspaceLogo: workspace.logo || workspace.businessLogo || ''
  };
};

const bookingsOverlap = ({ leftTime, leftDuration, rightTime, rightDuration }) => {
  const leftStart = timeToMinutes(leftTime);
  const rightStart = timeToMinutes(rightTime);
  if (leftStart === null || rightStart === null) return false;
  return leftStart < rightStart + rightDuration && rightStart < leftStart + leftDuration;
};

const findManualStaffAssignment = ({
  availabilityRules,
  bookingRecord,
  heldBookings = [],
  workspace = {}
}) => {
  const requestedStaffId = cleanString(bookingRecord.staffId, 120);
  const durationMinutes = parseDurationMinutes(bookingRecord.serviceDurationMinutes || bookingRecord.serviceDuration || '', availabilityRules.fallbackDurationMinutes);
  const staffCandidates = (workspace.publicStaff || [])
    .filter(staff => staff?.id && (!requestedStaffId || staff.id === requestedStaffId));
  const assignedStaff = staffCandidates.find(staff => !heldBookings.some((booking) => {
    if (!bookingBlocksAvailability(booking, availabilityRules.holdMode)) return false;
    const heldStaffId = cleanString(booking.staffId || booking.availabilityReservedStaffId, 120);
    if (heldStaffId && heldStaffId !== staff.id) return false;
    const heldDuration = parseDurationMinutes(booking.serviceDurationMinutes || booking.serviceDuration || '', availabilityRules.fallbackDurationMinutes);
    return bookingsOverlap({
      leftTime: bookingRecord.time,
      leftDuration: durationMinutes,
      rightTime: booking.time,
      rightDuration: heldDuration
    });
  }));

  return assignedStaff ? { staff: assignedStaff, durationMinutes } : null;
};

const writeOwnerBookingTransaction = async ({
  appId,
  ownerId,
  rawBooking,
  idempotencyKey,
  workspace
}) => {
  const userRef = db.collection('artifacts').doc(appId).collection('users').doc(ownerId);
  const workspaceSlug = cleanString(workspace.slug, 120).toLowerCase();
  const lockBaseRef = workspaceSlug
    ? db.collection('artifacts').doc(appId).collection('public').doc('data').collection('workspaces').doc(workspaceSlug)
    : userRef;
  const bookingRef = userRef.collection('bookings').doc();
  const notificationRef = userRef.collection('notifications').doc();
  const idempotencyRef = idempotencyKey
    ? userRef.collection('idempotencyKeys').doc(safeDocumentId(idempotencyKey))
    : null;
  const clientEmail = normalizeEmail(rawBooking.clientEmail);
  const threadId = rawBooking.threadId || safeThreadId(ownerId, bookingRef.id);
  const threadRef = db.collection('artifacts').doc(appId).collection('clientThreads').doc(threadId);
  const initialMessageRef = threadRef.collection('messages').doc();
  const clientAccessRef = clientEmail
    ? db.collection('artifacts').doc(appId).collection('clientAccess').doc(clientEmail).collection('bookings').doc(bookingRef.id)
    : null;

  let transactionResult = null;
  await db.runTransaction(async (transaction) => {
    if (idempotencyRef) {
      const existing = await transaction.get(idempotencyRef);
      if (existing.exists) {
        transactionResult = existing.data()?.result || { ok: true, bookingId: existing.data()?.bookingId, reused: true };
        return;
      }
    }

    const availabilityRules = normalizeAvailabilityRules(workspace);
    const bookingRecord = {
      ...applyWorkspaceDefaultsToOwnerBooking({ booking: rawBooking, workspace }),
      ownerId,
      threadId,
      availabilityMode: availabilityRules.enabled ? availabilityRules.staffAssignmentMode : 'legacy'
    };
    const shouldLockSlot = bookingRecord.dateKey && bookingBlocksAvailability(bookingRecord, availabilityRules.holdMode);

    if (shouldLockSlot) {
      if (availabilityRules.enabled) {
        const heldBookings = await getAvailabilityBookingsForDateInTransaction({
          transaction,
          appId,
          ownerId,
          dateKey: bookingRecord.dateKey
        });
        const requestedStaffId = bookingRecord.staffId || '';
        const availability = getServiceAvailabilityModel({
          bookings: heldBookings,
          dateKey: bookingRecord.dateKey,
          incoming: {
            serviceId: bookingRecord.serviceId,
            serviceDuration: bookingRecord.serviceDuration
          },
          requestedStaffId,
          requestedTime: bookingRecord.time,
          workspace
        });
        const manualAssignment = availability.selectedOption?.staff
          ? { staff: availability.selectedOption.staff, durationMinutes: availability.durationMinutes }
          : findManualStaffAssignment({ availabilityRules, bookingRecord, heldBookings, workspace });
        if (!manualAssignment?.staff) {
          throw new HttpsError('already-exists', 'That time no longer fits this service. Pick another slot.');
        }
        const assignedStaff = manualAssignment.staff;
        if (bookingRecord.staffId || availabilityRules.staffAssignmentMode !== 'later') {
          bookingRecord.staffId = assignedStaff.id;
          bookingRecord.staffName = assignedStaff.name || bookingRecord.staffName || '';
          bookingRecord.staffPhotoURL = assignedStaff.photoURL || bookingRecord.staffPhotoURL || '';
        } else {
          bookingRecord.availabilityReservedStaffId = assignedStaff.id;
        }
        bookingRecord.serviceDurationMinutes = manualAssignment.durationMinutes;
        bookingRecord.availabilityMode = availabilityRules.staffAssignmentMode;

        const startMinutes = timeToMinutes(bookingRecord.time);
        if (startMinutes === null) {
          throw new HttpsError('invalid-argument', 'Booking time is invalid.');
        }
        const lockRefs = getLockBucketIds({
          dateKey: bookingRecord.dateKey,
          staffId: assignedStaff.id,
          startMinutes,
          durationMinutes: manualAssignment.durationMinutes
        }).map(lockId => lockBaseRef.collection('slotLocks').doc(lockId));
        const lockSnaps = await Promise.all(lockRefs.map(lockRef => transaction.get(lockRef)));
        if (lockSnaps.some(lockSnap => lockSnap.exists)) {
          throw new HttpsError('already-exists', 'That time was just requested. Pick another slot.');
        }
        lockRefs.forEach((lockRef) => transaction.set(lockRef, {
          bookingId: bookingRef.id,
          ownerId,
          dateKey: bookingRecord.dateKey,
          time: bookingRecord.time,
          staffId: assignedStaff.id,
          durationMinutes: manualAssignment.durationMinutes,
          status: bookingRecord.status,
          ...getExpirationFields(SLOT_LOCK_TTL_MS),
          createdAt: serverTimestamp()
        }));
      } else {
        const lockRef = lockBaseRef.collection('slotLocks').doc(safeLockId(bookingRecord.dateKey, `${bookingRecord.staffId || 'workspace'}_${bookingRecord.time}`));
        const lockSnap = await transaction.get(lockRef);
        if (lockSnap.exists) {
          throw new HttpsError('already-exists', 'That time was just requested. Pick another slot.');
        }
        transaction.set(lockRef, {
          bookingId: bookingRef.id,
          ownerId,
          dateKey: bookingRecord.dateKey,
          time: bookingRecord.time,
          staffId: bookingRecord.staffId || '',
          status: bookingRecord.status,
          ...getExpirationFields(SLOT_LOCK_TTL_MS),
          createdAt: serverTimestamp()
        });
      }
    }

    transaction.set(bookingRef, bookingRecord);
    if (clientAccessRef) {
      transaction.set(clientAccessRef, {
        bookingId: bookingRef.id,
        threadId,
        ownerId,
        clientEmail,
        clientName: bookingRecord.clientName,
        workspaceSlug,
        workspaceName: bookingRecord.workspaceName,
        workspaceLogo: bookingRecord.workspaceLogo,
        date: bookingRecord.date,
        dateKey: bookingRecord.dateKey || null,
        time: bookingRecord.time,
        serviceId: bookingRecord.serviceId,
        serviceName: bookingRecord.serviceName,
        serviceDescription: bookingRecord.serviceDescription,
        servicePrice: bookingRecord.servicePrice,
        servicePriceType: bookingRecord.servicePriceType,
        serviceDuration: bookingRecord.serviceDuration,
        serviceCategory: bookingRecord.serviceCategory,
        staffId: bookingRecord.staffId || '',
        staffName: bookingRecord.staffName || '',
        staffPhotoURL: bookingRecord.staffPhotoURL || '',
        serviceDurationMinutes: bookingRecord.serviceDurationMinutes,
        availabilityMode: bookingRecord.availabilityMode,
        paymentMethod: bookingRecord.paymentMethod,
        paymentGateway: bookingRecord.paymentGateway,
        paymentProviderName: bookingRecord.paymentProviderName,
        paymentStatus: bookingRecord.paymentStatus,
        paymentReference: bookingRecord.paymentReference,
        status: bookingRecord.status,
        timestamp: bookingRecord.timestamp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
    transaction.set(threadRef, {
      ownerId,
      clientEmail,
      clientName: bookingRecord.clientName,
      bookingId: bookingRef.id,
      workspaceSlug,
      workspaceName: bookingRecord.workspaceName,
      workspaceLogo: bookingRecord.workspaceLogo,
      serviceId: bookingRecord.serviceId,
      serviceName: bookingRecord.serviceName,
      paymentMethod: bookingRecord.paymentMethod,
      paymentGateway: bookingRecord.paymentGateway,
      paymentProviderName: bookingRecord.paymentProviderName,
      paymentStatus: bookingRecord.paymentStatus,
      paymentReference: bookingRecord.paymentReference,
      staffId: bookingRecord.staffId || '',
      staffName: bookingRecord.staffName || '',
      staffPhotoURL: bookingRecord.staffPhotoURL || '',
      bookingStatus: bookingRecord.status,
      status: 'open',
      lastMessage: `Booking ${rawBooking.source === 'support-chat' ? 'added from chat' : 'added'}${bookingRecord.serviceName ? ` for ${bookingRecord.serviceName}` : ''} on ${bookingRecord.date} at ${bookingRecord.time}.`,
      lastMessageAt: serverTimestamp(),
      lastMessageAtMs: bookingRecord.timestamp,
      ownerUnread: admin.firestore.FieldValue.increment(0),
      clientUnread: admin.firestore.FieldValue.increment(1),
      createdAt: serverTimestamp(),
      createdAtMs: bookingRecord.timestamp,
      updatedAt: serverTimestamp(),
      updatedAtMs: bookingRecord.timestamp
    }, { merge: true });
    transaction.set(initialMessageRef, {
      text: `Booking added${bookingRecord.serviceName ? ` for ${bookingRecord.serviceName}` : ''} on ${bookingRecord.date} at ${bookingRecord.time}.`,
      kind: 'booking-created',
      bookingId: bookingRef.id,
      senderId: 'system',
      senderName: 'Build A Booking',
      senderRole: 'system',
      createdAt: serverTimestamp()
    });
    transaction.set(notificationRef, {
      audience: 'owner',
      type: 'booking_request',
      title: rawBooking.source === 'support-chat'
        ? `Chat booking added for ${bookingRecord.clientName}`
        : `Manual booking added for ${bookingRecord.clientName}`,
      body: `${bookingRecord.serviceName ? `${bookingRecord.serviceName} / ` : ''}${bookingRecord.date} at ${bookingRecord.time}.`,
      ownerId,
      bookingId: bookingRef.id,
      threadId,
      clientName: bookingRecord.clientName,
      clientEmail,
      workspaceSlug,
      tab: 'bookings',
      priority: 'normal',
      read: false,
      createdAtMs: bookingRecord.timestamp,
      createdAt: serverTimestamp()
    });
    transactionResult = { ok: true, bookingId: bookingRef.id, threadId, reused: false };
    if (idempotencyRef) {
      transaction.set(idempotencyRef, {
        key: idempotencyKey,
        bookingId: bookingRef.id,
        ownerId,
        workspaceSlug,
        result: transactionResult,
        createdAtMs: bookingRecord.timestamp,
        ...getExpirationFields(IDEMPOTENCY_TTL_MS),
        createdAt: serverTimestamp()
      });
    }
  });

  return transactionResult || { ok: true, bookingId: bookingRef.id, threadId };
};

const sendClientReminder = async ({
  appId,
  bookingDoc,
  booking,
  ownerId,
  reminderKey,
  title,
  body
}) => {
  const clientEmail = normalizeEmail(booking.clientEmail);
  if (!clientEmail) return false;
  const fieldKey = reminderKey === '24h' ? 'client24h' : 'client2h';
  const reminderDocId = `reminder-${reminderKey}-${bookingDoc.id}`;
  const notificationRef = db
    .collection('artifacts').doc(appId)
    .collection('clientAccess').doc(clientEmail)
    .collection('notifications').doc(reminderDocId);

  let created = false;
  await db.runTransaction(async (transaction) => {
    const [freshBookingSnap, notificationSnap] = await Promise.all([
      transaction.get(bookingDoc.ref),
      transaction.get(notificationRef)
    ]);
    const freshBooking = freshBookingSnap.data() || {};
    if (notificationSnap.exists || freshBooking.remindersSent?.[fieldKey]) return;
    if (freshBooking.status !== 'confirmed') return;

    transaction.set(notificationRef, {
      audience: 'client',
      type: 'booking_reminder',
      title,
      body,
      ownerId,
      bookingId: bookingDoc.id,
      threadId: freshBooking.threadId || booking.threadId || '',
      clientName: freshBooking.clientName || booking.clientName || '',
      clientEmail,
      workspaceName: freshBooking.workspaceName || booking.workspaceName || '',
      view: 'bookings',
      priority: reminderKey === '2h' ? 'high' : 'normal',
      read: false,
      createdAtMs: Date.now(),
      metadata: {
        reminderKey,
        dateKey: freshBooking.dateKey || booking.dateKey || '',
        time: freshBooking.time || booking.time || '',
        serviceName: freshBooking.serviceName || booking.serviceName || ''
      },
      createdAt: serverTimestamp()
    });
    transaction.update(bookingDoc.ref, {
      [`remindersSent.${fieldKey}`]: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    created = true;
  });
  return created;
};

exports.getEmailProviderStatus = onCall(emailCallableOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in before checking email status.');
  }
  return getEmailProviderStatus({ resendApiKeySecret: RESEND_API_KEY });
});

exports.sendAuthVerificationEmail = onCall(emailCallableOptions, async (request) => {
  if (!request.auth?.uid) {
    throw new HttpsError('unauthenticated', 'Sign in before sending a verification email.');
  }
  const email = normalizeEmail(request.auth.token?.email || '');
  if (!isValidEmail(email)) {
    throw new HttpsError('failed-precondition', 'This account is missing a valid email address.');
  }
  if (request.auth.token?.email_verified === true) {
    return { ok: true, skipped: true, alreadyVerified: true, reason: 'Email is already verified.' };
  }
  await authEmailRateLimit({ request, email });

  const actionLink = await admin.auth().generateEmailVerificationLink(email, getAuthActionSettings('verifyEmail'));
  const emailContent = buildVerificationEmail({ actionLink });
  return sendEmail({
    resendApiKeySecret: RESEND_API_KEY,
    to: email,
    subject: emailContent.subject,
    html: emailContent.html,
    text: emailContent.text
  });
});

exports.sendPasswordResetEmail = onCall(emailCallableOptions, async (request) => {
  const email = normalizeEmailAddress(request.data?.email || '');
  if (!isValidEmail(email)) {
    throw new HttpsError('invalid-argument', 'Enter a valid email address.');
  }
  await authEmailRateLimit({ request, email });

  try {
    const actionLink = await admin.auth().generatePasswordResetLink(email, getAuthActionSettings('resetPassword'));
    const emailContent = buildPasswordResetEmail({ actionLink });
    const result = await sendEmail({
      resendApiKeySecret: RESEND_API_KEY,
      to: email,
      subject: emailContent.subject,
      html: emailContent.html,
      text: emailContent.text
    });
    return { ok: true, delivered: Boolean(result.ok) };
  } catch (error) {
    if (error?.code === 'auth/user-not-found') {
      return { ok: true, delivered: false };
    }
    throw error;
  }
});

exports.sendBookingClientEmail = onCall(emailCallableOptions, async (request) => {
  const appId = requireString(request.data?.appId || DEFAULT_APP_ID, 'App ID', 120);
  const ownerId = requireString(request.data?.ownerId || request.auth?.uid, 'Workspace owner', 120);
  const bookingId = requireString(request.data?.bookingId, 'Booking', 160);
  const templateKey = cleanString(request.data?.templateKey, 40);
  const allowedTemplates = new Set(['bookingReceived', 'confirmed', 'declined', 'waitlist', 'runningLate', 'review', 'reminder24h', 'reminder2h']);
  if (!allowedTemplates.has(templateKey)) {
    throw new HttpsError('invalid-argument', 'Email template is not supported.');
  }
  await assertCanWriteOwnerBooking({ appId, ownerId, request });

  const bookingSnap = await db
    .collection('artifacts').doc(appId)
    .collection('users').doc(ownerId)
    .collection('bookings').doc(bookingId)
    .get();
  if (!bookingSnap.exists) {
    throw new HttpsError('not-found', 'Booking was not found.');
  }
  const { settings, communications } = await readOwnerWorkspaceEmailContext({ appId, ownerId });
  const booking = { id: bookingSnap.id, ...(bookingSnap.data() || {}) };
  return sendClientBookingEmail({
    appId,
    ownerId,
    booking,
    communications,
    settings,
    templateKey,
    extra: request.data?.extra || {}
  });
});

exports.createOwnerBookingRequest = onCall(bookingCallableOptions, async (request) => {
  const appId = requireString(request.data?.appId || DEFAULT_APP_ID, 'App ID', 120);
  const ownerId = requireString(request.data?.ownerId || request.auth?.uid, 'Workspace owner', 120);
  const idempotencyKey = cleanString(request.data?.idempotencyKey, 180);
  await assertCanWriteOwnerBooking({ appId, ownerId, request });

  const workspace = await getOwnerBookingWorkspace({ appId, ownerId });
  const rawBooking = validateOwnerBookingPayload(request.data?.booking || {});
  return writeOwnerBookingTransaction({
    appId,
    ownerId,
    rawBooking,
    idempotencyKey,
    workspace
  });
});

exports.getPublicServiceAvailability = onCall(publicCallableOptions, async (request) => {
  const {
    appId,
    workspaceSlug,
    dateKey,
    incoming,
    requestedStaffId
  } = validateAvailabilityLookupPayload(request.data || {});

  await assertRateLimit({
    db,
    appId,
    workspaceSlug,
    action: 'availability_lookup',
    request
  });

  const workspaceRef = db
    .collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('workspaces').doc(workspaceSlug);
  const workspaceSnap = await workspaceRef.get();
  if (!workspaceSnap.exists) throw new HttpsError('not-found', 'This booking page is not published yet.');
  const workspace = workspaceSnap.data() || {};
  const ownerId = workspace.ownerId;
  if (!ownerId) throw new HttpsError('failed-precondition', 'This booking page is missing an owner.');
  const heldBookings = await getAvailabilityBookingsForDate({ appId, ownerId, dateKey });
  const availability = getServiceAvailabilityModel({
    bookings: heldBookings,
    dateKey,
    incoming,
    requestedStaffId,
    workspace
  });
  return {
    rules: availability.rules,
    durationMinutes: availability.durationMinutes,
    staffOptions: availability.rules.staffAssignmentMode === 'client' ? availability.staffOptions : [],
    times: availability.timeOptions,
    unavailableReason: availability.unavailableReason
  };
});

exports.createPublicBookingRequest = onCall(bookingCallableOptions, async (request) => {
  const appId = requireString(request.data?.appId, 'App ID', 120);
  const workspaceSlug = requireString(request.data?.workspaceSlug, 'Workspace slug', 120).toLowerCase();
  const rawBooking = request.data?.booking || {};
  const idempotencyKey = cleanString(request.data?.idempotencyKey || rawBooking.idempotencyKey, 180);

  await assertRateLimit({
    db,
    appId,
    workspaceSlug,
    action: 'booking_create',
    request,
    subject: rawBooking.clientEmail || rawBooking.clientPhone || rawBooking.clientName || idempotencyKey
  });

  const workspaceRef = db
    .collection('artifacts').doc(appId)
    .collection('public').doc('data')
    .collection('workspaces').doc(workspaceSlug);

  const workspaceSnap = await workspaceRef.get();
  if (!workspaceSnap.exists) {
    throw new HttpsError('not-found', 'This booking page is not published yet.');
  }

  const workspace = workspaceSnap.data() || {};
  const ownerId = workspace.ownerId;
  if (!ownerId) {
    throw new HttpsError('failed-precondition', 'This booking page is missing an owner.');
  }

  const availabilityRules = normalizeAvailabilityRules(workspace);
  const incoming = alignBookingWithWorkspace({
    booking: validatePublicBookingPayload(rawBooking),
    workspace,
    availabilityRules
  });
  const {
    clientName,
    clientPhone,
    clientEmail,
    clientEmailOptIn,
    clientBirthday,
    clientNote,
    serviceId,
    serviceName,
    serviceDescription,
    servicePrice,
    servicePriceType,
    serviceDuration,
    serviceCategory,
    staffId: requestedStaffId,
    staffName: requestedStaffName,
    staffPhotoURL: requestedStaffPhotoURL,
    date,
    dateKey,
    time,
    status,
    paymentMethod,
    paymentGateway,
    paymentProviderName
  } = incoming;
  const isManualPayment = ['manual_eft', 'cash'].includes(paymentMethod) || ['manual_eft', 'cash'].includes(paymentGateway);
  const paymentStatus = isManualPayment ? 'manual_pending' : 'unpaid';
  const notificationChannels = {
    email: clientEmailOptIn,
    portal: Boolean(clientEmail)
  };

  const bookingRef = db
    .collection('artifacts').doc(appId)
    .collection('users').doc(ownerId)
    .collection('bookings').doc();
  const publicSubmissionRef = workspaceRef.collection('bookingSubmissions').doc(bookingRef.id);
  const notificationRef = db
    .collection('artifacts').doc(appId)
    .collection('notificationJobs').doc();
  const ownerNotificationRef = db
    .collection('artifacts').doc(appId)
    .collection('users').doc(ownerId)
    .collection('notifications').doc();
  const threadId = safeThreadId(ownerId, bookingRef.id);
  const threadRef = db
    .collection('artifacts').doc(appId)
    .collection('clientThreads').doc(threadId);
  const initialMessageRef = threadRef.collection('messages').doc();
  const clientAccessRef = clientEmail
    ? db
      .collection('artifacts').doc(appId)
      .collection('clientAccess').doc(clientEmail)
      .collection('bookings').doc(bookingRef.id)
    : null;
  const clientNotificationRef = clientEmail
    ? db
      .collection('artifacts').doc(appId)
      .collection('clientAccess').doc(clientEmail)
      .collection('notifications').doc()
    : null;
  const shouldLockSlot = dateKey && bookingBlocksAvailability({ status, time }, availabilityRules.holdMode);
  const idempotencyRef = idempotencyKey
    ? db
      .collection('artifacts').doc(appId)
      .collection('users').doc(ownerId)
      .collection('idempotencyKeys').doc(safeDocumentId(idempotencyKey))
    : null;

  const bookingRecord = {
    ownerId,
    clientName,
    clientPhone,
    clientEmail,
    clientEmailOptIn,
    clientBirthday,
    clientNote,
    serviceId,
    serviceName,
    serviceDescription,
    servicePrice,
    servicePriceType,
    serviceDuration,
    serviceCategory,
    staffId: '',
    staffName: '',
    staffPhotoURL: '',
    availabilityMode: availabilityRules.enabled ? availabilityRules.staffAssignmentMode : 'legacy',
    serviceDurationMinutes: parseDurationMinutes(serviceDuration, availabilityRules.fallbackDurationMinutes),
    notificationChannels,
    date,
    dateKey: dateKey || null,
    time,
    status,
    source: 'public-booking-page',
    paymentMethod,
    paymentGateway,
    paymentProviderName,
    paymentStatus,
    paymentReference: isManualPayment ? bookingRef.id : '',
    workspaceSlug,
    workspaceName: workspace.workspaceName || workspace.brandName || '',
    workspaceLogo: workspace.logo || workspace.businessLogo || '',
    threadId,
    timestamp: Date.now(),
    createdAt: serverTimestamp()
  };

  let transactionResult = null;
  await db.runTransaction(async (transaction) => {
    if (idempotencyRef) {
      const idempotencySnap = await transaction.get(idempotencyRef);
      if (idempotencySnap.exists) {
        const stored = idempotencySnap.data() || {};
        transactionResult = stored.result || { ok: true, bookingId: stored.bookingId, reused: true };
        return;
      }
    }

    if (shouldLockSlot) {
      if (availabilityRules.enabled) {
        const heldBookings = await getAvailabilityBookingsForDateInTransaction({
          transaction,
          appId,
          ownerId,
          dateKey
        });
        const requestedAvailabilityStaffId = availabilityRules.staffAssignmentMode === 'client' ? requestedStaffId : '';
        const availability = getServiceAvailabilityModel({
          bookings: heldBookings,
          dateKey,
          incoming: { serviceId, serviceDuration },
          requestedStaffId: requestedAvailabilityStaffId,
          requestedTime: time,
          workspace
        });
        if (!availability.selectedOption?.staff) {
          throw new HttpsError('already-exists', 'That time no longer fits this service. Pick another slot.');
        }
        const assignedStaff = availability.selectedOption.staff;
        if (availabilityRules.staffAssignmentMode !== 'later') {
          bookingRecord.staffId = assignedStaff.id;
          bookingRecord.staffName = assignedStaff.name || requestedStaffName;
          bookingRecord.staffPhotoURL = assignedStaff.photoURL || requestedStaffPhotoURL;
        } else {
          bookingRecord.availabilityReservedStaffId = assignedStaff.id;
        }
        bookingRecord.serviceDurationMinutes = availability.durationMinutes;
        bookingRecord.availabilityMode = availabilityRules.staffAssignmentMode;

        const startMinutes = timeToMinutes(time);
        if (startMinutes === null) {
          throw new HttpsError('invalid-argument', 'Booking time is invalid.');
        }
        const lockRefs = getLockBucketIds({
          dateKey,
          staffId: assignedStaff.id,
          startMinutes,
          durationMinutes: availability.durationMinutes
        }).map(lockId => workspaceRef.collection('slotLocks').doc(lockId));
        const lockSnaps = await Promise.all(lockRefs.map(lockRef => transaction.get(lockRef)));
        if (lockSnaps.some(lockSnap => lockSnap.exists)) {
          throw new HttpsError('already-exists', 'That time was just requested. Pick another slot.');
        }
        lockRefs.forEach((lockRef) => transaction.set(lockRef, {
          bookingId: bookingRef.id,
          ownerId,
          dateKey,
          time,
          staffId: assignedStaff.id,
          durationMinutes: availability.durationMinutes,
          status,
          ...getExpirationFields(SLOT_LOCK_TTL_MS),
          createdAt: serverTimestamp()
        }));
      } else {
        const slotLockRef = workspaceRef.collection('slotLocks').doc(safeLockId(dateKey, time));
        const lockSnap = await transaction.get(slotLockRef);
        if (lockSnap.exists) {
          throw new HttpsError('already-exists', 'That time was just requested. Pick another slot.');
        }
        transaction.set(slotLockRef, {
          bookingId: bookingRef.id,
          ownerId,
          dateKey,
          time,
          status,
          ...getExpirationFields(SLOT_LOCK_TTL_MS),
          createdAt: serverTimestamp()
        });
      }
    }

    transaction.set(bookingRef, bookingRecord);
    transaction.set(publicSubmissionRef, bookingRecord);
    if (clientAccessRef) {
      transaction.set(clientAccessRef, {
        bookingId: bookingRef.id,
        threadId,
        ownerId,
        clientEmail,
        clientName,
        workspaceSlug,
        workspaceName: bookingRecord.workspaceName,
        workspaceLogo: bookingRecord.workspaceLogo,
        date,
        dateKey: dateKey || null,
        time,
        serviceId,
        serviceName,
        serviceDescription,
        servicePrice,
        servicePriceType,
        serviceDuration,
        serviceCategory,
        staffId: bookingRecord.staffId,
        staffName: bookingRecord.staffName,
        staffPhotoURL: bookingRecord.staffPhotoURL,
        serviceDurationMinutes: bookingRecord.serviceDurationMinutes,
        availabilityMode: bookingRecord.availabilityMode,
        paymentMethod,
        paymentGateway,
        paymentProviderName,
        paymentStatus,
        paymentReference: isManualPayment ? bookingRef.id : '',
        status,
        timestamp: bookingRecord.timestamp,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
    }
    transaction.set(threadRef, {
      ownerId,
      clientEmail,
      clientName,
      bookingId: bookingRef.id,
      workspaceSlug,
      workspaceName: bookingRecord.workspaceName,
      workspaceLogo: bookingRecord.workspaceLogo,
      serviceId,
      serviceName,
      paymentMethod,
      paymentGateway,
      paymentProviderName,
      paymentStatus,
      paymentReference: isManualPayment ? bookingRef.id : '',
      staffId: bookingRecord.staffId,
      staffName: bookingRecord.staffName,
      staffPhotoURL: bookingRecord.staffPhotoURL,
      bookingStatus: status,
      status: 'open',
      lastMessage: `Booking request received${serviceName ? ` for ${serviceName}` : ''} on ${date} at ${time}.`,
      lastMessageAt: serverTimestamp(),
      lastMessageAtMs: bookingRecord.timestamp,
      ownerUnread: 1,
      clientUnread: 0,
      rescheduleStatus: '',
      createdAt: serverTimestamp(),
      createdAtMs: bookingRecord.timestamp,
      updatedAt: serverTimestamp(),
      updatedAtMs: bookingRecord.timestamp
    }, { merge: true });
    transaction.set(ownerNotificationRef, {
      audience: 'owner',
      type: 'booking_request',
      title: `New booking request from ${clientName}`,
      body: `${serviceName ? `${serviceName} / ` : ''}${date} at ${time}. Review, confirm, waitlist, or reply from My Bookings.`,
      ownerId,
      bookingId: bookingRef.id,
      threadId,
      clientName,
      clientEmail,
      workspaceSlug,
      tab: 'bookings',
      priority: 'high',
      read: false,
      createdAtMs: bookingRecord.timestamp,
      createdAt: serverTimestamp()
    });
    if (clientNotificationRef) {
      transaction.set(clientNotificationRef, {
        audience: 'client',
        type: 'booking_received',
        title: 'Your booking request was sent',
        body: `${bookingRecord.workspaceName || 'The business'} received your request${serviceName ? ` for ${serviceName}` : ''} on ${date} at ${time}. Track it in your client portal.`,
        ownerId,
        bookingId: bookingRef.id,
        threadId,
        clientName,
        clientEmail,
        workspaceSlug,
        workspaceName: bookingRecord.workspaceName,
        view: 'bookings',
        priority: 'normal',
        read: false,
        createdAtMs: bookingRecord.timestamp,
        createdAt: serverTimestamp()
      });
    }
    transaction.set(initialMessageRef, {
      text: `Booking request received${serviceName ? ` for ${serviceName}` : ''} on ${date} at ${time}. The business can confirm, reply, or help you reschedule here.`,
      kind: 'booking-created',
      bookingId: bookingRef.id,
      senderId: 'system',
      senderName: 'Build A Booking',
      senderRole: 'system',
      createdAt: serverTimestamp()
    });
    transaction.set(notificationRef, {
      appId,
      ownerId,
      bookingId: bookingRef.id,
      workspaceSlug,
      threadId,
      type: 'new-booking-request',
      status: 'queued',
      channels: notificationChannels,
      createdAtMs: bookingRecord.timestamp,
      updatedAtMs: bookingRecord.timestamp,
      ...getExpirationFields(7 * 24 * 60 * 60 * 1000),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    transactionResult = { ok: true, bookingId: bookingRef.id, paymentReference: bookingRecord.paymentReference || '', reused: false };
    if (idempotencyRef) {
      transaction.set(idempotencyRef, {
        key: idempotencyKey,
        bookingId: bookingRef.id,
        ownerId,
        workspaceSlug,
        result: transactionResult,
        createdAtMs: bookingRecord.timestamp,
        ...getExpirationFields(IDEMPOTENCY_TTL_MS),
        createdAt: serverTimestamp()
      });
    }
  });

  return transactionResult || { ok: true, bookingId: bookingRef.id };
});

exports.processNotificationJob = onDocumentCreated({
  ...emailWorkerFunctionOptions,
  document: 'artifacts/{appId}/notificationJobs/{jobId}'
}, async (event) => {
  const { appId } = event.params;
  const snap = event.data;
  if (!snap) return;

  const job = snap.data() || {};
  const status = getEmailProviderStatus({ resendApiKeySecret: RESEND_API_KEY });
  if (!status.configured) {
    await snap.ref.set({
      status: 'waiting-for-provider-setup',
      providerState: {
        email: 'missing',
        clientPortal: 'active',
        missing: status.missing
      },
      lastNote: job.type === 'new-booking-request'
        ? 'Booking notification queued. Connect Resend secrets to enable email sending.'
        : 'Notification queued.',
      updatedAt: serverTimestamp()
    }, { merge: true });
    return;
  }

  const ownerId = cleanString(job.ownerId, 120);
  const bookingId = cleanString(job.bookingId, 160);
  if (!ownerId || !bookingId) {
    await snap.ref.set({
      status: 'skipped',
      providerState: { email: 'skipped', reason: 'missing-booking-reference', clientPortal: 'active' },
      updatedAt: serverTimestamp()
    }, { merge: true });
    return;
  }

  try {
    const bookingSnap = await db
      .collection('artifacts').doc(appId)
      .collection('users').doc(ownerId)
      .collection('bookings').doc(bookingId)
      .get();
    if (!bookingSnap.exists) {
      await snap.ref.set({
        status: 'skipped',
        providerState: { email: 'skipped', reason: 'booking-not-found', clientPortal: 'active' },
        updatedAt: serverTimestamp()
      }, { merge: true });
      return;
    }

    const booking = { id: bookingSnap.id, ...(bookingSnap.data() || {}) };
    const { settings, communications, account } = await readOwnerWorkspaceEmailContext({ appId, ownerId });
    const { baseUrl } = getEmailRuntimeConfig({ resendApiKeySecret: RESEND_API_KEY });
    const ownerEmail = await getOwnerEmail({ ownerId, account });
    const results = {};

    if (ownerEmail && getEmailChannelEnabled(communications, 'ownerNewBooking', true)) {
      const ownerEmailContent = buildOwnerBookingRequestEmail({
        booking,
        ownerEmail,
        settings,
        baseUrl
      });
      results.owner = await sendEmail({
        resendApiKeySecret: RESEND_API_KEY,
        to: ownerEmailContent.to,
        subject: ownerEmailContent.subject,
        html: ownerEmailContent.html,
        text: ownerEmailContent.text
      });
    } else {
      results.owner = { ok: false, skipped: true, reason: ownerEmail ? 'Owner booking email is turned off.' : 'Missing owner email.' };
    }

    if (job.channels?.email && normalizeEmail(booking.clientEmail) && getEmailChannelEnabled(communications, 'clientBookingReceived', true)) {
      results.client = await sendClientBookingEmail({
        appId,
        ownerId,
        booking,
        communications,
        settings,
        templateKey: 'bookingReceived'
      });
    } else {
      results.client = { ok: false, skipped: true, reason: 'Client email consent or channel is off.' };
    }

    const delivered = [results.owner, results.client].filter(result => result?.ok).length;
    await snap.ref.set({
      status: delivered ? 'sent' : 'skipped',
      providerState: {
        email: delivered ? 'sent' : 'skipped',
        ownerEmail: results.owner?.ok ? 'sent' : 'skipped',
        clientEmail: results.client?.ok ? 'sent' : 'skipped',
        clientPortal: 'active',
        ownerReason: results.owner?.reason || '',
        clientReason: results.client?.reason || ''
      },
      sentAtMs: delivered ? Date.now() : null,
      updatedAt: serverTimestamp()
    }, { merge: true });
  } catch (error) {
    console.error('Notification email job failed', error);
    await snap.ref.set({
      status: 'failed',
      providerState: {
        email: 'failed',
        clientPortal: 'active'
      },
      lastError: cleanString(error?.message || 'Email notification failed.', 500),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }
});

exports.syncBookingOperationalState = onDocumentWritten({
  ...workerFunctionOptions,
  document: 'artifacts/{appId}/users/{ownerId}/bookings/{bookingId}'
}, async (event) => {
  const { appId, ownerId, bookingId } = event.params;
  const before = event.data?.before?.exists ? (event.data.before.data() || {}) : null;
  const after = event.data?.after?.exists ? (event.data.after.data() || {}) : null;

  await syncBookingAvailabilityHold({
    admin,
    db,
    appId,
    ownerId,
    bookingId,
    before,
    after
  });

  if (after?.status === 'confirmed') {
    await enqueueBookingReminderJobs({ appId, ownerId, bookingId, booking: after });
  } else if (before?.status === 'confirmed' || !after) {
    await cancelReminderJobs({ appId, bookingId, reason: after ? 'booking-not-confirmed' : 'booking-deleted' });
  }
});

exports.sendBookingReminderNotifications = onSchedule({
  ...emailWorkerFunctionOptions,
  schedule: 'every 15 minutes',
  timeZone: REMINDER_TIME_ZONE
}, async () => {
  const appId = DEFAULT_APP_ID;
  const nowMs = Date.now();
  const queueSnap = await db
    .collection('artifacts').doc(appId)
    .collection('reminderQueue')
    .where('status', '==', 'queued')
    .where('dueAtMs', '<=', nowMs + REMINDER_WINDOW_AHEAD_MS)
    .orderBy('dueAtMs', 'asc')
    .limit(200)
    .get();
  let createdCount = 0;

  for (const queueDoc of queueSnap.docs) {
    const job = queueDoc.data() || {};
    const ownerId = cleanString(job.ownerId, 120);
    const bookingId = cleanString(job.bookingId, 120);
    const reminderKey = cleanString(job.reminderKey, 20);
    if (!ownerId || !bookingId || !['24h', '2h'].includes(reminderKey)) {
      await queueDoc.ref.set({ status: 'skipped', updatedAtMs: nowMs, updatedAt: serverTimestamp() }, { merge: true });
      continue;
    }

    await queueDoc.ref.set({
      attempts: admin.firestore.FieldValue.increment(1),
      lastAttemptAtMs: nowMs,
      updatedAtMs: nowMs,
      updatedAt: serverTimestamp()
    }, { merge: true });

    try {
      const bookingRef = db
        .collection('artifacts').doc(appId)
        .collection('users').doc(ownerId)
        .collection('bookings').doc(bookingId);
      const bookingSnap = await bookingRef.get();
      if (!bookingSnap.exists) {
        await queueDoc.ref.set({ status: 'skipped', skippedReason: 'booking-missing', updatedAtMs: Date.now(), updatedAt: serverTimestamp() }, { merge: true });
        continue;
      }
      const booking = bookingSnap.data() || {};
      const offsetMs = reminderKey === '24h' ? 24 * 60 * 60 * 1000 : 2 * 60 * 60 * 1000;
      if (!reminderIsDue({ booking, nowMs, offsetMs })) {
        await queueDoc.ref.set({ status: 'queued', updatedAtMs: Date.now(), updatedAt: serverTimestamp() }, { merge: true });
        continue;
      }
      const created = await sendClientReminder({
        appId,
        bookingDoc: { id: bookingSnap.id, ref: bookingRef },
        booking,
        ownerId,
        reminderKey,
        title: job.title || (reminderKey === '24h' ? 'Your booking is tomorrow' : 'Your booking is coming up soon'),
        body: job.body || 'Open your client portal for booking details.'
      });
      let emailResult = { ok: false, skipped: true, reason: 'Reminder notification was not created.' };
      if (created) {
        const { settings, communications } = await readOwnerWorkspaceEmailContext({ appId, ownerId });
        emailResult = await sendClientBookingEmail({
          appId,
          ownerId,
          booking: { id: bookingSnap.id, ...booking },
          communications,
          settings,
          templateKey: reminderKey === '24h' ? 'reminder24h' : 'reminder2h'
        }).catch(error => ({
          ok: false,
          skipped: false,
          reason: cleanString(error?.message || 'Reminder email failed.', 500)
        }));
      }
      await queueDoc.ref.set({
        status: created ? 'sent' : 'skipped',
        emailStatus: emailResult.ok ? 'sent' : (emailResult.skipped ? 'skipped' : 'failed'),
        emailNote: emailResult.reason || '',
        sentAtMs: created ? Date.now() : null,
        updatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });
      if (created) createdCount += 1;
    } catch (error) {
      console.error('Reminder queue job failed', error);
      await queueDoc.ref.set({
        status: 'queued',
        lastError: cleanString(error?.message || 'Reminder job failed.', 500),
        updatedAtMs: Date.now(),
        updatedAt: serverTimestamp()
      }, { merge: true });
    }
  }

  console.log(`Booking reminder notifications created: ${createdCount}`);
});

const deleteExpiredCollectionGroup = async ({ collectionGroup, nowMs, limit = 300 }) => {
  const snap = await db.collectionGroup(collectionGroup)
    .where('expiresAtMs', '<=', nowMs)
    .limit(limit)
    .get();
  if (snap.empty) return 0;
  const batch = db.batch();
  snap.docs.forEach(doc => batch.delete(doc.ref));
  await batch.commit();
  return snap.size;
};

exports.cleanupOperationalDocuments = onSchedule({
  ...workerFunctionOptions,
  schedule: 'every 60 minutes',
  timeZone: REMINDER_TIME_ZONE
}, async () => {
  const nowMs = Date.now();
  const results = await Promise.all([
    deleteExpiredCollectionGroup({ collectionGroup: 'securityRateLimits', nowMs }),
    deleteExpiredCollectionGroup({ collectionGroup: 'slotLocks', nowMs }),
    deleteExpiredCollectionGroup({ collectionGroup: 'idempotencyKeys', nowMs }),
    deleteExpiredCollectionGroup({ collectionGroup: 'notificationJobs', nowMs }),
    deleteExpiredCollectionGroup({ collectionGroup: 'reminderQueue', nowMs })
  ]);
  console.log('Operational cleanup deleted docs:', {
    securityRateLimits: results[0],
    slotLocks: results[1],
    idempotencyKeys: results[2],
    notificationJobs: results[3],
    reminderQueue: results[4]
  });
});

exports.backfillWorkspaceScaleCollections = onCall({
  ...workerFunctionOptions,
  timeoutSeconds: 120,
  memory: '512MiB'
}, async (request) => {
  if (!request.auth?.uid) throw new HttpsError('unauthenticated', 'Sign in before running a workspace backfill.');
  const appId = cleanString(request.data?.appId || DEFAULT_APP_ID, 120);
  const ownerId = cleanString(request.data?.ownerId || request.auth.uid, 120);
  if (ownerId !== request.auth.uid) {
    throw new HttpsError('permission-denied', 'Only the workspace owner can run this backfill.');
  }
  const results = await backfillWorkspaceScaleCollections({ db, appId, ownerId });
  results.availabilityHolds = { written: await backfillAvailabilityHoldsForWorkspace({ appId, ownerId }) };
  results.threadTimestamps = { updated: await backfillThreadTimestampsForWorkspace({ appId, ownerId }) };
  return { ok: true, ownerId, results };
});

exports.createCheckoutSession = onCall(workerFunctionOptions, async () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new HttpsError('failed-precondition', 'Stripe is not configured yet.');
  }
  throw new HttpsError('unimplemented', 'Checkout wiring is ready for your Stripe price IDs.');
});

exports.createBillingPortalSession = onCall(workerFunctionOptions, async () => {
  if (!process.env.STRIPE_SECRET_KEY) {
    throw new HttpsError('failed-precondition', 'Stripe is not configured yet.');
  }
  throw new HttpsError('unimplemented', 'Billing portal wiring is ready for your Stripe customer IDs.');
});

const paymentFunctions = require('./payments');
Object.assign(exports, paymentFunctions);
