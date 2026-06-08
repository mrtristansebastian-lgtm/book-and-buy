import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';

const clampLimit = (value, fallback = 100) => Math.min(500, Math.max(1, Number(value || fallback)));

const ownerCollection = (ownerId, collectionName) => (
  FirebaseSDK.collection(db, 'artifacts', appId, 'users', ownerId, collectionName)
);

const docsToPage = (snapshot, cursorFromDoc, requestedLimit) => {
  const rows = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
  const lastDoc = snapshot.docs[snapshot.docs.length - 1] || null;
  return {
    rows,
    cursor: lastDoc ? cursorFromDoc(lastDoc) : null,
    hasMore: rows.length >= requestedLimit
  };
};

export const createWorkspacePageLoaders = ({ ownerId }) => {
  const canLoad = () => Boolean(isFirebaseConfigured && db && ownerId);

  const loadBookingsPage = async ({
    cursor = null,
    dateFrom = '',
    dateTo = '',
    limitCount = 100,
    status = ''
  } = {}) => {
    if (!canLoad()) return { rows: [], cursor: null, hasMore: false };
    const constraints = [];
    if (status) constraints.push(FirebaseSDK.where('status', '==', status));
    if (dateFrom) constraints.push(FirebaseSDK.where('dateKey', '>=', dateFrom));
    if (dateTo) constraints.push(FirebaseSDK.where('dateKey', '<=', dateTo));
    if (dateFrom || dateTo) {
      constraints.push(FirebaseSDK.orderBy('dateKey', 'asc'), FirebaseSDK.orderBy('timestamp', 'desc'));
      if (cursor?.dateKey && cursor?.timestamp !== undefined) constraints.push(FirebaseSDK.startAfter(cursor.dateKey, cursor.timestamp));
    } else {
      constraints.push(FirebaseSDK.orderBy('timestamp', 'desc'));
      if (cursor?.timestamp !== undefined) constraints.push(FirebaseSDK.startAfter(cursor.timestamp));
    }
    const pageSize = clampLimit(limitCount);
    constraints.push(FirebaseSDK.limit(pageSize));
    const snapshot = await FirebaseSDK.getDocs(FirebaseSDK.query(ownerCollection(ownerId, 'bookings'), ...constraints));
    return docsToPage(snapshot, docSnap => ({
      dateKey: docSnap.data()?.dateKey || '',
      timestamp: docSnap.data()?.timestamp || 0
    }), pageSize);
  };

  const loadClientsPage = async ({ cursor = null, limitCount = 100 } = {}) => {
    if (!canLoad()) return { rows: [], cursor: null, hasMore: false };
    const constraints = [
      FirebaseSDK.orderBy('updatedAtMs', 'desc')
    ];
    if (cursor?.updatedAtMs !== undefined) constraints.push(FirebaseSDK.startAfter(cursor.updatedAtMs));
    const pageSize = clampLimit(limitCount);
    constraints.push(FirebaseSDK.limit(pageSize));
    const snapshot = await FirebaseSDK.getDocs(FirebaseSDK.query(ownerCollection(ownerId, 'clients'), ...constraints));
    return docsToPage(snapshot, docSnap => ({ updatedAtMs: docSnap.data()?.updatedAtMs || 0 }), pageSize);
  };

  const loadFinanceAttemptsPage = async ({ cursor = null, limitCount = 100 } = {}) => {
    if (!canLoad()) return { rows: [], cursor: null, hasMore: false };
    const constraints = [
      FirebaseSDK.orderBy('updatedAtMs', 'desc')
    ];
    if (cursor?.updatedAtMs !== undefined) constraints.push(FirebaseSDK.startAfter(cursor.updatedAtMs));
    const pageSize = clampLimit(limitCount);
    constraints.push(FirebaseSDK.limit(pageSize));
    const snapshot = await FirebaseSDK.getDocs(FirebaseSDK.query(ownerCollection(ownerId, 'payment_attempts'), ...constraints));
    return docsToPage(snapshot, docSnap => ({ updatedAtMs: docSnap.data()?.updatedAtMs || 0 }), pageSize);
  };

  const loadCalendarDaysPage = async ({
    calendarId = '',
    cursor = null,
    dateFrom = '',
    dateTo = '',
    limitCount = 180
  } = {}) => {
    if (!canLoad()) return { rows: [], cursor: null, hasMore: false };
    const constraints = [];
    if (calendarId) constraints.push(FirebaseSDK.where('calendarId', '==', calendarId));
    if (dateFrom) constraints.push(FirebaseSDK.where('dateKey', '>=', dateFrom));
    if (dateTo) constraints.push(FirebaseSDK.where('dateKey', '<=', dateTo));
    constraints.push(FirebaseSDK.orderBy('dateKey', 'asc'));
    if (cursor?.dateKey) constraints.push(FirebaseSDK.startAfter(cursor.dateKey));
    const pageSize = clampLimit(limitCount, 180);
    constraints.push(FirebaseSDK.limit(pageSize));
    const snapshot = await FirebaseSDK.getDocs(FirebaseSDK.query(ownerCollection(ownerId, 'calendarDays'), ...constraints));
    return docsToPage(snapshot, docSnap => ({ dateKey: docSnap.data()?.dateKey || '' }), pageSize);
  };

  return {
    loadBookingsPage,
    loadCalendarDaysPage,
    loadClientsPage,
    loadFinanceAttemptsPage
  };
};
