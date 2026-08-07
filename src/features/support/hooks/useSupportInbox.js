import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { takeSupportFocusThread } from '../utils/supportFormat';

export function useSupportInbox() {
  const ctx = useWorkspace();
  const {
    threads,
    clients,
    bookings,
    orders,
    sendThreadMessage,
    markThreadRead,
    setThreadPresence,
    updateThread,
    confirmBooking,
    declineBooking,
    waitlistBooking,
    fulfilOrder,
    markOrderPaid,
    cancelOrder
  } = ctx;

  const sorted = useMemo(
    () => [...(threads || [])].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [threads]
  );

  const [activeId, setActiveId] = useState('');
  const [mobileShowChat, setMobileShowChat] = useState(false);
  const [clientDrawerOpen, setClientDrawerOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const [composerPrefill, setComposerPrefill] = useState('');

  useEffect(() => {
    const focusId = takeSupportFocusThread();
    if (focusId && sorted.some((thread) => thread.id === focusId)) {
      setActiveId(focusId);
      setMobileShowChat(true);
      return;
    }
    if (!activeId && sorted[0]?.id) setActiveId(sorted[0].id);
  }, [sorted, activeId]);

  const active = sorted.find((thread) => thread.id === activeId) || sorted[0] || null;

  useEffect(() => {
    if (active?.id && active.unread) markThreadRead(active.id);
  }, [active?.id, active?.unread, markThreadRead]);

  /* Soft presence drift for demo realism */
  useEffect(() => {
    if (!active?.id || !active.presence) return undefined;
    const timer = window.setInterval(() => {
      const status = active.presence?.status || 'offline';
      if (status === 'online' && Math.random() > 0.7) {
        setThreadPresence(active.id, { status: 'away', lastSeenAt: Date.now() });
      } else if (status === 'away' && Math.random() > 0.85) {
        setThreadPresence(active.id, { status: 'offline', lastSeenAt: Date.now() });
      }
    }, 45000);
    return () => window.clearInterval(timer);
  }, [active?.id, active?.presence?.status, setThreadPresence]);

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
    unreadCount: (threads || []).filter((thread) => thread.unread).length
  };
}
