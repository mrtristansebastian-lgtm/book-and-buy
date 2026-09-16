import { navigate } from '../../app/routing';
import { isFirebaseConfigured, ensureClientThread } from './clientThreadsApi';

/**
 * Instagram-style “Message” from a business profile / booking / order.
 * Creates or reuses a thread, follows the slug, opens `#/app/messages/:id`.
 */
export async function startClientMessage({
  profile,
  followSlug,
  workspace,
  startThreadFromClient,
  startThreadFromBooking,
  startThreadFromOrder,
  ownerId = '',
  slug = '',
  brandName = '',
  logoUrl = '',
  booking = null,
  order = null,
  subject = ''
} = {}) {
  if (!profile?.email) {
    navigate('/app/auth');
    return null;
  }

  const workspaceSlug = slug || workspace?.slug || '';
  const bizName = brandName || workspace?.brandName || workspaceSlug || 'Business';
  const resolvedOwner =
    ownerId || workspace?.ownerId || workspace?.id || workspace?.uid || '';
  const threadSubject =
    subject ||
    (booking
      ? `Re: ${booking.serviceName || 'Booking'}`
      : order
        ? `Order · ${order.id || 'Products'}`
        : `Message · ${bizName}`);

  if (workspaceSlug && followSlug) {
    try {
      await followSlug(workspaceSlug);
    } catch {
      /* ignore */
    }
  }

  if (isFirebaseConfigured() && resolvedOwner) {
    try {
      const thread = await ensureClientThread({
        ownerId: resolvedOwner,
        clientEmail: profile.email,
        clientName: profile.displayName || '',
        clientUid: profile.uid || '',
        subject: threadSubject,
        brandName: bizName,
        workspaceSlug,
        logoUrl: logoUrl || workspace?.logoUrl || workspace?.website?.logoUrl || '',
        bookingId: booking?.id || '',
        orderId: order?.id || ''
      });
      if (thread?.id) {
        navigate(`/app/messages/${thread.id}`);
        return thread;
      }
    } catch {
      /* fall through to local */
    }
  }

  let local = null;
  if (booking && startThreadFromBooking) {
    local = startThreadFromBooking(booking);
  } else if (order && startThreadFromOrder) {
    local = startThreadFromOrder(order);
  } else if (startThreadFromClient) {
    local = startThreadFromClient({
      name: profile.displayName || 'Client',
      email: profile.email
    });
  }

  if (local?.id) {
    navigate(`/app/messages/${local.id}`);
    return local;
  }

  navigate('/app/messages');
  return null;
}
