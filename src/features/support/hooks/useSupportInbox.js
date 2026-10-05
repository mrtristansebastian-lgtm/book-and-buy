import { useEffect, useMemo, useRef, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { takeSupportFocusThread } from '../utils/supportFormat';
import { collection, doc, limit, onSnapshot, query, updateDoc, where, writeBatch } from 'firebase/firestore';
import { getFirebase } from '../../../shared/firebase/client';
import { APP_ID } from '../../../config/appConfig';
import { subscribeThreadMessages } from '../../client-app/clientThreadsApi';

export function useSupportInbox() {
  const ctx = useWorkspace();
  const {
    threads,
    clients,
    bookings,
    orders,
    sendThreadMessage: sendLocalThreadMessage,
    markThreadRead: markLocalThreadRead,
    setThreadPresence,
    updateThread: updateLocalThread,
    confirmBooking,
    declineBooking,
    waitlistBooking,
    fulfilOrder,
    markOrderPaid,
    cancelOrder
  } = ctx;

  const ownerId = ctx.workspace.ownerId || '';
  const demo = ctx.workspace.isDemo === true;
  const scope = `${demo ? 'demo' : 'owner'}:${ownerId}`;
  const [selection, setSelection] = useState({ scope, id: '' });
  const activeId = selection.scope === scope ? selection.id : '';
  const setActiveId = id => setSelection({ scope, id });
  // Keep Schedule/Requests focus until the asynchronous owner thread listener
  // contains it. Consuming storage again on each snapshot loses this request.
  const focusThread = useRef(undefined);
  if (focusThread.current === undefined) focusThread.current = { scope, id: takeSupportFocusThread() };
  if (focusThread.current.scope !== scope) focusThread.current = { scope, id: '' };
  const focusId = focusThread.current.scope === scope ? focusThread.current.id : '';
  const requestedId = focusId || activeId;
  const [remoteList, setRemoteList] = useState({ scope: '', threads: [] });
  const [focusedRemote, setFocusedRemote] = useState({ scope: '', id: '', thread: null });
  const [messageState, setMessageState] = useState({ scope: '', id: '', messages: [] });
  const remoteThreads = useMemo(() => {
    const merged = new Map((remoteList.scope === scope ? remoteList.threads : []).map(thread => [thread.id, thread]));
    if (focusedRemote.scope === scope && focusedRemote.id === requestedId && focusedRemote.thread) {
      merged.set(focusedRemote.id, focusedRemote.thread);
    }
    return [...merged.values()];
  }, [remoteList, focusedRemote, requestedId, scope]);
  const remoteMessages = messageState.scope === scope && messageState.id === activeId ? messageState.messages : [];
  useEffect(() => {
    let active = true;
    setRemoteList({ scope, threads: [] });
    const firebase = getFirebase();
    if (demo || !firebase || !ownerId) return undefined;
    const unsubscribe = onSnapshot(query(collection(firebase.db, 'artifacts', APP_ID, 'clientThreads'), where('ownerId', '==', ownerId), limit(60)), snapshot => {
      if (active) setRemoteList({ scope, threads: snapshot.docs.filter(item => item.data().ownerId === ownerId).map(item => ({ ...item.data(), id: item.id })) });
    }, () => { if (active) setRemoteList({ scope, threads: [] }); });
    return () => { active = false; unsubscribe(); };
  }, [scope, demo, ownerId]);
  // A requested conversation may be older than the bounded inbox query. Read
  // that existing document separately, and include it only for this owner.
  useEffect(() => {
    let active = true;
    setFocusedRemote({ scope, id: requestedId, thread: null });
    const firebase = getFirebase();
    if (demo || !firebase || !ownerId || !/^[a-zA-Z0-9_-]{1,128}$/.test(requestedId)) return undefined;
    const unsubscribe = onSnapshot(doc(firebase.db, 'artifacts', APP_ID, 'clientThreads', requestedId), snapshot => {
      if (!active) return;
      const data = snapshot.exists() ? snapshot.data() : null;
      setFocusedRemote({ scope, id: requestedId, thread: data?.ownerId === ownerId ? { ...data, id: requestedId } : null });
    }, () => { if (active) setFocusedRemote({ scope, id: requestedId, thread: null }); });
    return () => { active = false; unsubscribe(); };
  }, [scope, demo, ownerId, requestedId]);
  useEffect(() => {
    let active = true;
    setMessageState({ scope, id: activeId, messages: [] });
    if (!activeId || !remoteThreads.some((thread) => thread.id === activeId)) return undefined;
    const unsubscribe = subscribeThreadMessages(activeId, messages => { if (active) setMessageState({ scope, id: activeId, messages }); });
    return () => { active = false; unsubscribe(); };
  }, [scope, activeId, remoteThreads.map((thread) => thread.id).join('|')]);
  const updateThread = (id, patch) => {
    const firebase = getFirebase();
    if (ctx.workspace.isDemo || !remoteThreads.some((thread) => thread.id === id)) return updateLocalThread(id, patch);
    if (!firebase) throw new Error('Chat is not connected.');
    return updateDoc(doc(firebase.db, 'artifacts', APP_ID, 'clientThreads', id), patch);
  };
  const sorted = useMemo(() => {
    const merged = new Map((threads || []).map((thread) => [thread.id, thread]));
    remoteThreads.forEach((thread) => merged.set(thread.id, { ...merged.get(thread.id), ...thread, messages: thread.id === activeId ? remoteMessages : [] }));
    return [...merged.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [threads, remoteThreads, remoteMessages, activeId]);
  const sendThreadMessage = async (id, payload) => {
    const firebase = getFirebase();
    if (ctx.workspace.isDemo || !remoteThreads.some((thread) => thread.id === id)) return sendLocalThreadMessage(id, payload);
    if (!firebase) throw new Error('Chat is not connected.');
    const at = Date.now();
    const batch = writeBatch(firebase.db);
    batch.set(doc(collection(firebase.db, 'artifacts', APP_ID, 'clientThreads', id, 'messages')), { ...payload, from: 'business', at });
    batch.update(doc(firebase.db, 'artifacts', APP_ID, 'clientThreads', id), { lastMessageAt: at, updatedAt: at, unreadForClient: true, lastMessagePreview: String(payload.body || (payload.type === 'voice' ? 'Voice note' : 'Attachment')).slice(0, 140) });
    await batch.commit();
  };
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [composerPrefill, setComposerPrefill] = useState('');

  useEffect(() => {
    setSelection({ scope, id: '' });
    setMobileShowChat(false);
    setClientDrawerOpen(false);
  }, [scope]);

  useEffect(() => {
    if (focusId && sorted.some((thread) => thread.id === focusId)) {
      focusThread.current = { scope, id: '' };
      setActiveId(focusId);
      setMobileShowChat(true);
      return;
    }
    if (!activeId && sorted[0]?.id) setActiveId(sorted[0].id);
  }, [sorted, activeId, focusId, scope]);

  const active = sorted.find((thread) => thread.id === activeId) || sorted[0] || null;

  useEffect(() => {
    if (active?.id && active.unread) {
      if (remoteThreads.some((thread) => thread.id === active.id)) updateThread(active.id, { unread: false }).catch(() => {});
      else markLocalThreadRead(active.id);
    }
  }, [active?.id, active?.unread, markLocalThreadRead]);

  /* Soft presence drift for demo realism (online ↔ offline only) */
  useEffect(() => {
    if (!active?.id || !active.presence || active.presence.visible === false) return undefined;
    const timer = window.setInterval(() => {
      const status = active.presence?.status === 'online' ? 'online' : 'offline';
      if (status === 'online' && Math.random() > 0.82) {
        setThreadPresence(active.id, {
          status: 'offline',
          lastSeenAt: Date.now(),
          visible: true
        });
      } else if (status === 'offline' && Math.random() > 0.9) {
        setThreadPresence(active.id, {
          status: 'online',
          lastSeenAt: Date.now(),
          visible: true
        });
      }
    }, 60000);
    return () => window.clearInterval(timer);
  }, [active?.id, active?.presence?.status, active?.presence?.visible, setThreadPresence]);

  const matchedClient = useMemo(() => {
    if (!active) return null;
    return (
      (clients || []).find(
        (client) =>
          client.id === active.clientId ||
          String(client.email || '').toLowerCase() ===
            String(active.clientEmail || '').toLowerCase()
      ) || {
        id: active.clientId || '',
        name: active.clientName,
        email: active.clientEmail,
        phone: '',
        country: ''
      }
    );
  }, [active, clients]);

  const clientBookings = useMemo(() => {
    if (!active) return [];
    const email = String(active.clientEmail || '').toLowerCase();
    return (bookings || []).filter(
      (booking) =>
        booking.id === active.bookingId ||
        String(booking.clientEmail || '').toLowerCase() === email
    );
  }, [active, bookings]);

  const clientOrders = useMemo(() => {
    if (!active) return [];
    const email = String(active.clientEmail || '').toLowerCase();
    return (orders || []).filter(
      (order) =>
        order.id === active.orderId || String(order.clientEmail || '').toLowerCase() === email
    );
  }, [active, orders]);

  const linkedBooking =
    clientBookings.find((booking) => booking.id === active?.bookingId) || clientBookings[0] || null;
  const linkedOrder =
    clientOrders.find((order) => order.id === active?.orderId) || clientOrders[0] || null;

  const selectThread = (id) => {
    focusThread.current = { scope, id: '' };
    setActiveId(id);
    setMobileShowChat(true);
    setClientDrawerOpen(false);
  };

  const backToList = () => {
    setMobileShowChat(false);
    setClientDrawerOpen(false);
  };

  return {
    sorted,
    active,
    activeId,
    selectThread,
    mobileShowChat,
    backToList,
    clientDrawerOpen,
    setClientDrawerOpen,
    lightboxUrl,
    setLightboxUrl,
    composerPrefill,
    setComposerPrefill,
    matchedClient,
    clientBookings,
    clientOrders,
    linkedBooking,
    linkedOrder,
    sendThreadMessage,
    updateThread,
    confirmBooking,
    declineBooking,
    waitlistBooking,
    fulfilOrder,
    markOrderPaid,
    cancelOrder,
    unreadCount: sorted.filter((thread) => thread.unread).length
  };
}
