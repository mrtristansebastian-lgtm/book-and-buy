import { useMemo } from 'react';
import { ChevronRight, MessageCircle, LogOut } from 'lucide-react';
import { navigate, publicPagePath } from '../../../app/routing';
import { formatDisplayDate } from '../../../utils/dates';
import { formatCents } from '../../../utils/products';
import { DemoModePanel } from '../../../shared/ui/DemoModePanel';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';
import { startClientMessage } from '../startClientMessage';

function StatusPill({ children }) {
  return <span className="bb-client-pill">{children}</span>;
}

/** Account: profile + bookings + orders for the signed-in client. */
export function ClientAccountPage({ section = 'account' }) {
  const { profile, clearClientSession, followSlug } = useClientProfile();
  const { bookings, orders, workspace, startThreadFromBooking, startThreadFromOrder } =
    useWorkspace();
  const email = String(profile?.email || '').toLowerCase();
  const tab =
    section === 'bookings' || section === 'orders' ? section : 'overview';

  const myBookings = useMemo(
    () =>
      (bookings || []).filter(
        (booking) =>
          String(booking.clientEmail || '').toLowerCase() === email ||
          (profile?.uid && booking.clientUid === profile.uid)
      ),
    [bookings, email, profile?.uid]
  );

  const myOrders = useMemo(
    () =>
      (orders || []).filter(
        (order) =>
          String(order.clientEmail || '').toLowerCase() === email ||
          (profile?.uid && order.clientUid === profile.uid)
      ),
    [orders, email, profile?.uid]
  );

  const messageAbout = async (kind, item) => {
    if (!item) return;
    await startClientMessage({
      profile,
      followSlug,
      workspace,
      startThreadFromBooking,
      startThreadFromOrder,
      ownerId: workspace?.ownerId || workspace?.id || '',
      slug: workspace?.slug || '',
      brandName: workspace?.brandName || '',
      logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl || '',
      booking: kind === 'booking' ? item : null,
      order: kind === 'order' ? item : null
    });
  };

  return (
    <ClientAppShell section="account" title="Account">
      <div className="bb-client-account">
        <section className="bb-client-profile">
          <div className="bb-client-avatar" aria-hidden="true">
            {(profile?.displayName || profile?.email || 'C').charAt(0).toUpperCase()}
          </div>
          <div className="bb-client-profile-copy">
            <strong>{profile?.displayName || 'Client'}</strong>
            <span className="bb-muted">{profile?.email}</span>
          </div>
          <button
            type="button"
            className="bb-client-icon-btn"
            aria-label="Sign out"
            onClick={async () => {
              await clearClientSession();
              navigate('/app/auth', { replace: true });
            }}
          >
            <LogOut size={18} strokeWidth={2} />
          </button>
        </section>

        <div className="bb-segment bb-client-account-tabs">
          <button
            type="button"
            aria-pressed={tab === 'overview'}
            onClick={() => navigate('/app/account')}
          >
            Overview
          </button>
          <button
            type="button"
            aria-pressed={tab === 'bookings'}
            onClick={() => navigate('/app/account/bookings')}
          >
            Bookings ({myBookings.length})
          </button>
          <button
            type="button"
            aria-pressed={tab === 'orders'}
            onClick={() => navigate('/app/account/orders')}
          >
            Orders ({myOrders.length})
          </button>
        </div>

        {tab === 'overview' ? (
          <div className="bb-client-stack">
            <button
              type="button"
              className="bb-client-row"
              onClick={() => navigate('/app/account/bookings')}
            >
              <span>
                <strong>Bookings</strong>
                <span className="bb-muted">{myBookings.length} total</span>
              </span>
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              className="bb-client-row"
              onClick={() => navigate('/app/account/orders')}
            >
              <span>
                <strong>Orders</strong>
                <span className="bb-muted">{myOrders.length} total</span>
              </span>
              <ChevronRight size={18} />
            </button>
            {workspace?.slug ? (
              <button
                type="button"
                className="bb-client-row"
                onClick={() => navigate(publicPagePath(workspace.slug, 'home'))}
              >
                <span>
                  <strong>Visit {workspace.brandName || workspace.slug}</strong>
                  <span className="bb-muted">Public site</span>
                </span>
                <ChevronRight size={18} />
              </button>
            ) : null}
            {workspace?.isDemo || profile?.isDemo ? (
              <DemoModePanel className="bb-demo-panel--account" variant="client" />
            ) : null}
          </div>
        ) : null}

        {tab === 'bookings' ? (
          <div className="bb-client-stack">
            {myBookings.length === 0 ? (
              <p className="bb-client-empty">No bookings yet. Explore businesses to book.</p>
            ) : (
              myBookings.map((booking) => (
                <article key={booking.id} className="bb-client-item">
                  <div className="bb-client-item-top">
                    <strong>{booking.serviceName || 'Service'}</strong>
                    <StatusPill>{booking.status}</StatusPill>
                  </div>
                  <p className="bb-muted m-0 text-sm">
                    {formatDisplayDate(booking.dateKey || booking.date)} · {booking.time}
                  </p>
                  <p className="bb-muted m-0 text-sm">{booking.paymentStatus}</p>
                  <button
                    type="button"
                    className="bb-client-text-btn"
                    onClick={() => messageAbout('booking', booking)}
                  >
                    <MessageCircle size={14} /> Message business
                  </button>
                </article>
              ))
            )}
          </div>
        ) : null}

        {tab === 'orders' ? (
          <div className="bb-client-stack">
            {myOrders.length === 0 ? (
              <p className="bb-client-empty">No orders yet.</p>
            ) : (
              myOrders.map((order) => (
                <article key={order.id} className="bb-client-item">
                  <div className="bb-client-item-top">
                    <strong>{order.clientName || 'Order'}</strong>
                    <StatusPill>{order.status}</StatusPill>
                  </div>
                  <p className="bb-muted m-0 text-sm">
                    {formatCents(order.amountInCents || 0)} · {order.paymentStatus}
                  </p>
                  <button
                    type="button"
                    className="bb-client-text-btn"
                    onClick={() => messageAbout('order', order)}
                  >
                    <MessageCircle size={14} /> Message business
                  </button>
                </article>
              ))
            )}
          </div>
        ) : null}
      </div>
    </ClientAppShell>
  );
}
