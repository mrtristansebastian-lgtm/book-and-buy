import { navigate } from '../../../app/routing';
import { formatPresenceLabel } from '../utils/supportFormat';
import { ChatHeader } from './ChatHeader';
import { ChatComposer } from './ChatComposer';
import { ClientFileDrawer } from './ClientFileDrawer';
import { MessageTimeline } from './MessageBubble';

export function ConversationPane({ inbox }) {
  const {
    active,
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
    fulfilOrder,
    markOrderPaid
  } = inbox;

  if (!active) {
    return (
      <div className="bb-support-pane">
        <div className="bb-support-empty">
          <p className="bb-page-title text-xl m-0">Select a conversation</p>
          <p className="bb-muted m-0 text-sm">
            Start one from Booking Requests, Product Orders, or Clients.
          </p>
        </div>
      </div>
    );
  }

  const postSystem = (body) =>
    sendThreadMessage(active.id, { type: 'system', body, from: 'business' });

  return (
    <div className="bb-support-pane">
      <ChatHeader
        thread={active}
        showBack={mobileShowChat}
        onBack={backToList}
        onOpenClient={() => setClientDrawerOpen(true)}
        quickActionProps={{
          linkedBooking,
          linkedOrder,
          clientEmail: active.clientEmail,
          clientBookings,
          clientOrders,
          onConfirmBooking: () => {
            if (!linkedBooking) return;
            confirmBooking(linkedBooking.id);
            postSystem(`Booking confirmed · ${linkedBooking.serviceName}`);
          },
          onDeclineBooking: () => {
            if (!linkedBooking) return;
            declineBooking(linkedBooking.id);
            postSystem(`Booking declined · ${linkedBooking.serviceName}`);
          },
          onSuggestReschedule: () => {
            setComposerPrefill(
              linkedBooking
                ? `Would ${linkedBooking.dateKey || linkedBooking.date} ${linkedBooking.time} still work, or shall we find another slot?`
                : 'Would you like to pick another date and time?'
            );
          },
          onViewBooking: () => navigate('/dashboard/services'),
          onMarkPaid: () => {
            if (!linkedOrder) return;
            markOrderPaid(linkedOrder.id);
            postSystem('Order marked paid');
          },
          onFulfilOrder: () => {
            if (!linkedOrder) return;
            fulfilOrder(linkedOrder.id);
            postSystem('Order marked fulfilled');
          },
          onViewOrder: () => navigate('/dashboard/products'),
          onCopyEmail: async () => {
            if (!active.clientEmail) return;
            try {
              await navigator.clipboard.writeText(active.clientEmail);
              postSystem('Client email copied');
            } catch {
              /* ignore */
            }
          },
          onLinkBooking: (booking) => {
            updateThread(active.id, {
              bookingId: booking.id,
              subject: active.subject?.startsWith('Re:')
                ? active.subject
                : `Re: ${booking.serviceName}`
            });
            postSystem(`Booking linked · ${booking.serviceName}`);
          },
          onLinkOrder: (order) => {
            const label = (order.items || []).map((item) => item.name).join(' + ') || 'Order';
            updateThread(active.id, {
              orderId: order.id,
              subject: active.subject?.startsWith('Order')
                ? active.subject
                : `Order · ${label}`
            });
            postSystem(`Order linked · ${label}`);
          }
        }}
      />

      <MessageTimeline
        messages={active.messages || []}
        onOpenImage={(url) => setLightboxUrl(url)}
      />

      <ChatComposer
        threadId={active.id}
        prefill={composerPrefill}
        onPrefillConsumed={() => setComposerPrefill('')}
        onSend={(payload) => sendThreadMessage(active.id, payload)}
      />

      <ClientFileDrawer
        open={clientDrawerOpen}
        onClose={() => setClientDrawerOpen(false)}
        client={matchedClient}
        bookings={clientBookings}
        orders={clientOrders}
        presenceLabel={formatPresenceLabel(active.presence)}
      />

      {lightboxUrl ? (
        <button
          type="button"
          className="bb-support-lightbox border-0"
          onClick={() => setLightboxUrl('')}
          aria-label="Close image"
        >
          <img src={lightboxUrl} alt="" />
        </button>
      ) : null}
    </div>
  );
}
