import { useWorkspace } from '../../workspace/WorkspaceContext';

/** Live counters shown on launcher tiles and mini-app tabs. */
export function useWorkspaceBadges() {
  const { threads, bookings, orders } = useWorkspace();
  const unreadSupport = (threads || []).filter((thread) => thread.unread).length;
  const pendingRequests = (bookings || []).filter((booking) =>
    ['pending', 'waitlist'].includes(booking.status)
  ).length;
  const pendingOrders = (orders || []).filter((order) =>
    ['pending', 'accepted', 'shipped'].includes(order.status)
  ).length;

  const byTab = {
    communications: unreadSupport,
    requests: pendingRequests,
    orders: pendingOrders
  };

  const badgeFor = (tabId) => byTab[tabId] || 0;
  const badgeForApp = (app) =>
    (app?.tabs || []).reduce((sum, tabId) => sum + badgeFor(tabId), 0);

  return { unreadSupport, pendingRequests, pendingOrders, badgeFor, badgeForApp };
}
