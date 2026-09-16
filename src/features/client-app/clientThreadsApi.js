import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  updateDoc,
  where
} from 'firebase/firestore';
import { APP_ID } from '../../config/appConfig';
import { getFirebase, isFirebaseConfigured } from '../../shared/firebase/client';
import {
  clientThreadMessagesPath,
  clientThreadPath,
  clientThreadsPath
} from '../../shared/firebase/paths';

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

/** Prefer exact Auth email for Firestore rules equality with request.auth.token.email. */
function authEmail(email) {
  return String(email || '').trim();
}

function mapThread(id, data = {}, messages = []) {
  return {
    id,
    ...data,
    clientEmail: normalizeEmail(data.clientEmail),
    bookingId: data.bookingId || '',
    orderId: data.orderId || '',
    brandName: data.brandName || '',
    workspaceSlug: data.workspaceSlug || '',
    logoUrl: data.logoUrl || '',
    messages,
    unread: Boolean(data.unreadForClient ?? data.unread),
    updatedAt: data.updatedAt || data.lastMessageAt || 0
  };
}

function findReusableThread(existing, { ownerId, bookingId, orderId, subject, workspaceSlug }) {
  if (bookingId) {
    const hit = existing.find(
      (thread) => thread.ownerId === ownerId && thread.bookingId === bookingId
    );
    if (hit) return hit;
  }
  if (orderId) {
    const hit = existing.find(
      (thread) => thread.ownerId === ownerId && thread.orderId === orderId
    );
    if (hit) return hit;
  }
  if (!bookingId && !orderId) {
    const hit = existing.find(
      (thread) =>
        thread.ownerId === ownerId &&
        !thread.bookingId &&
        !thread.orderId &&
        (thread.workspaceSlug === workspaceSlug ||
          thread.subject === subject ||
          String(thread.subject || '').startsWith('Message ·'))
    );
    if (hit) return hit;
  }
  return null;
}

/** List threads for a client email (Firestore). */
export async function listClientThreadsByEmail(email) {
  const firebase = getFirebase();
  const exact = authEmail(email);
  const needle = normalizeEmail(email);
  if (!firebase || !exact) return [];
  const col = collection(firebase.db, ...clientThreadsPath(APP_ID));
  const snap = await getDocs(query(col, where('clientEmail', '==', exact), limit(60)));
  let rows = snap.docs.map((item) => mapThread(item.id, item.data() || {}));
  if (!rows.length && needle !== exact) {
    const alt = await getDocs(query(col, where('clientEmail', '==', needle), limit(60)));
    rows = alt.docs.map((item) => mapThread(item.id, item.data() || {}));
  }
  return rows;
}

/** Subscribe to threads for a client email. */
export function subscribeClientThreadsByEmail(email, onChange) {
  const firebase = getFirebase();
  const exact = authEmail(email);
  if (!firebase || !exact) {
    onChange([]);
    return () => {};
  }
  const col = collection(firebase.db, ...clientThreadsPath(APP_ID));
  const q = query(col, where('clientEmail', '==', exact), limit(60));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((item) => mapThread(item.id, item.data() || {})));
    },
    () => onChange([])
  );
}

/** Load messages for a thread (newest last). */
export async function loadThreadMessages(threadId) {
  const firebase = getFirebase();
  if (!firebase || !threadId) return [];
  const col = collection(firebase.db, ...clientThreadMessagesPath(APP_ID, threadId));
  try {
    const snap = await getDocs(query(col, orderBy('at', 'asc'), limit(200)));
    return snap.docs.map((item) => ({ id: item.id, ...(item.data() || {}) }));
  } catch {
    const snap = await getDocs(query(col, limit(200)));
    return snap.docs
      .map((item) => ({ id: item.id, ...(item.data() || {}) }))
      .sort((a, b) => (a.at || 0) - (b.at || 0));
  }
}

/** Subscribe to messages in a thread. */
export function subscribeThreadMessages(threadId, onChange) {
  const firebase = getFirebase();
  if (!firebase || !threadId) {
    onChange([]);
    return () => {};
  }
  const col = collection(firebase.db, ...clientThreadMessagesPath(APP_ID, threadId));
  const q = query(col, orderBy('at', 'asc'), limit(200));
  return onSnapshot(
    q,
    (snap) => {
      onChange(snap.docs.map((item) => ({ id: item.id, ...(item.data() || {}) })));
    },
    () => onChange([])
  );
}

/**
 * Create or reuse a client→business thread.
 * Requires ownerId + matching clientEmail (rules).
 */
export async function ensureClientThread({
  ownerId,
  clientEmail,
  clientName = '',
  clientUid = '',
  subject = 'Message',
  brandName = '',
  workspaceSlug = '',
  logoUrl = '',
  bookingId = '',
  orderId = ''
}) {
  const firebase = getFirebase();
  const email = authEmail(clientEmail);
  if (!firebase || !ownerId || !email) return null;

  const existing = await listClientThreadsByEmail(email);
  const reuse = findReusableThread(existing, {
    ownerId,
    bookingId,
    orderId,
    subject,
    workspaceSlug
  });
  if (reuse) return reuse;

  const now = Date.now();
  const ref = doc(collection(firebase.db, ...clientThreadsPath(APP_ID)));
  const payload = {
    ownerId,
    clientEmail: email,
    clientName: clientName || email.split('@')[0] || 'Client',
    clientUid: clientUid || '',
    subject,
    brandName: brandName || '',
    workspaceSlug: workspaceSlug || '',
    logoUrl: logoUrl || '',
    bookingId: bookingId || '',
    orderId: orderId || '',
    unread: false,
    unreadForClient: false,
    updatedAt: now,
    lastMessageAt: now,
    createdAt: now,
    lastMessagePreview: ''
  };
  await setDoc(ref, payload);
  return mapThread(ref.id, payload, []);
}

/** Clear unread for the client on a thread. */
export async function markClientThreadRead(threadId) {
  const firebase = getFirebase();
  if (!firebase || !threadId) return;
  await updateDoc(doc(firebase.db, ...clientThreadPath(APP_ID, threadId)), {
    unreadForClient: false
  });
}

/** Send a client message into a thread. */
export async function sendClientThreadMessage(threadId, { body, from = 'client' } = {}) {
  const firebase = getFirebase();
  const text = String(body || '').trim();
  if (!firebase || !threadId || !text) return null;
  const now = Date.now();
  const message = {
    type: 'text',
    from,
    body: text,
    at: now
  };
  const messagesCol = collection(firebase.db, ...clientThreadMessagesPath(APP_ID, threadId));
  const added = await addDoc(messagesCol, message);
  await updateDoc(doc(firebase.db, ...clientThreadPath(APP_ID, threadId)), {
    updatedAt: now,
    lastMessageAt: now,
    unread: true,
    unreadForClient: from !== 'client',
    lastMessagePreview: text.slice(0, 140)
  });
  return { id: added.id, ...message };
}

export { isFirebaseConfigured };
