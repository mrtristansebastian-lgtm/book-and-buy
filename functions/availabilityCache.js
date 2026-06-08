const { bookingBlocksAvailability, parseDurationMinutes } = require('./availability');

const HOLD_LIMIT = 1000;
const ANY_STAFF = '__any__';

const cleanString = (value, max = 240) => (
  String(value || '').trim().slice(0, max)
);

const normalizeStatus = (status = '') => cleanString(status, 60).toLowerCase() || 'pending';

const bookingHoldSummary = ({ bookingId, booking = {} }) => {
  const dateKey = cleanString(booking.dateKey, 32);
  const time = cleanString(booking.time, 80);
  const status = normalizeStatus(booking.status);
  if (!bookingId || !dateKey || !time || time === 'Waitlist') return null;
  if (!bookingBlocksAvailability({ status, time }, 'pending_confirmed')) return null;

  const staffId = cleanString(booking.staffId || booking.availabilityReservedStaffId, 120);
  const durationMinutes = Number(booking.serviceDurationMinutes) ||
    parseDurationMinutes(booking.serviceDuration || booking.serviceDurationMinutes || '', 60);

  return {
    bookingId,
    dateKey,
    time,
    status,
    staffId: staffId || ANY_STAFF,
    serviceDurationMinutes: durationMinutes,
    serviceDuration: cleanString(booking.serviceDuration || '', 80),
    source: cleanString(booking.source || '', 120),
    updatedAtMs: Date.now()
  };
};

const holdCollection = ({ db, appId, ownerId, dateKey }) => (
  db
    .collection('artifacts').doc(appId)
    .collection('users').doc(ownerId)
    .collection('availabilityDays').doc(dateKey)
    .collection('holds')
);

const holdRef = ({ db, appId, ownerId, dateKey, bookingId }) => (
  holdCollection({ db, appId, ownerId, dateKey }).doc(bookingId)
);

const toAvailabilityBooking = (hold = {}) => ({
  id: hold.bookingId || '',
  time: hold.time || '',
  status: hold.status || 'pending',
  staffId: hold.staffId && hold.staffId !== ANY_STAFF ? hold.staffId : '',
  availabilityReservedStaffId: hold.staffId && hold.staffId !== ANY_STAFF ? hold.staffId : '',
  serviceDurationMinutes: hold.serviceDurationMinutes || 60,
  serviceDuration: hold.serviceDuration || ''
});

const syncBookingAvailabilityHold = async ({
  admin,
  db,
  appId,
  ownerId,
  bookingId,
  before = null,
  after = null
}) => {
  if (!db || !appId || !ownerId || !bookingId) return;
  const beforeHold = before ? bookingHoldSummary({ bookingId, booking: before }) : null;
  const afterHold = after ? bookingHoldSummary({ bookingId, booking: after }) : null;
  const batch = db.batch();
  let changed = false;

  if (beforeHold && (!afterHold || beforeHold.dateKey !== afterHold.dateKey)) {
    batch.delete(holdRef({ db, appId, ownerId, dateKey: beforeHold.dateKey, bookingId }));
    changed = true;
  }

  if (afterHold) {
    const dayRef = db
      .collection('artifacts').doc(appId)
      .collection('users').doc(ownerId)
      .collection('availabilityDays').doc(afterHold.dateKey);
    batch.set(dayRef, {
      dateKey: afterHold.dateKey,
      updatedAtMs: Date.now(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    batch.set(holdRef({ db, appId, ownerId, dateKey: afterHold.dateKey, bookingId }), {
      ...afterHold,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    }, { merge: true });
    changed = true;
  }

  if (changed) await batch.commit();
};

const getCachedAvailabilityBookings = async ({ db, appId, ownerId, dateKey }) => {
  if (!db || !appId || !ownerId || !dateKey) return [];
  const snap = await holdCollection({ db, appId, ownerId, dateKey }).limit(HOLD_LIMIT).get();
  return snap.docs.map(doc => toAvailabilityBooking({ bookingId: doc.id, ...doc.data() }));
};

const getCachedAvailabilityBookingsInTransaction = async ({ transaction, db, appId, ownerId, dateKey }) => {
  if (!transaction || !db || !appId || !ownerId || !dateKey) return [];
  const snap = await transaction.get(holdCollection({ db, appId, ownerId, dateKey }).limit(HOLD_LIMIT));
  return snap.docs.map(doc => toAvailabilityBooking({ bookingId: doc.id, ...doc.data() }));
};

module.exports = {
  ANY_STAFF,
  bookingHoldSummary,
  getCachedAvailabilityBookings,
  getCachedAvailabilityBookingsInTransaction,
  syncBookingAvailabilityHold
};
