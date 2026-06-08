import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { notificationEmailKey } from '../../../services/notifications';
import { buildSupportThreadId } from '../utils/bookingActionHelpers';

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

export function createBookingChatActions({
  confirmLeavingUnsavedChanges,
  getBookingClientAvatar,
  isGuestWorkspace,
  navigateWorkspaceTab,
  safeStaffList,
  setActiveTab,
  setSupportThreadFocus,
  settings,
  showToast,
  updateBooking,
  user,
  visibleBookings,
  workspaceOwnerId
}) {
  const openBookingChat = async (booking) => {
    if (booking?.isExample) {
      showToast('Example preview only. Live bookings open the linked client chat.');
      return;
    }
    if (!booking?.id) {
      showToast('This booking is missing its record ID.');
      return;
    }
    if (isGuestWorkspace) {
      if (!confirmLeavingUnsavedChanges()) return;
      setSupportThreadFocus({ threadId: `guest-thread-${booking.id}`, bookingId: booking.id, requestId: Date.now() });
      setActiveTab('communications');
      return;
    }
    const emailKey = normalizeEmail(booking.clientEmail || '');
    if (!emailKey) {
      showToast('Add a client email before opening an in-app chat thread.');
      return;
    }

    const threadId = booking.threadId || buildSupportThreadId(workspaceOwnerId, booking.id);

    if (isFirebaseConfigured && user && db && workspaceOwnerId) {
      try {
        const threadRef = FirebaseSDK.doc(db, 'artifacts', appId, 'clientThreads', threadId);
        const threadSnap = await FirebaseSDK.getDoc(threadRef);
        const clientPhotoURL = getBookingClientAvatar(booking);
        if (!threadSnap.exists()) {
          const assignedStaff = booking.staffId ? safeStaffList.find(staff => staff.id === booking.staffId) : null;
          await FirebaseSDK.setDoc(threadRef, {
            ownerId: workspaceOwnerId,
            clientEmail: emailKey,
            clientName: booking.clientName || 'Client',
            clientPhotoURL,
            bookingId: booking.id,
            workspaceSlug: booking.workspaceSlug || settings.slug || '',
            workspaceName: booking.workspaceName || settings.brandName || '',
            workspaceLogo: booking.workspaceLogo || settings.logo || '',
            bookingStatus: booking.status || 'pending',
            status: 'open',
            lastMessage: `Booking chat opened for ${booking.date || 'this booking'} at ${booking.time || 'the requested time'}.`,
            lastMessageAt: FirebaseSDK.serverTimestamp(),
            lastMessageAtMs: Date.now(),
            ownerUnread: 0,
            clientUnread: 0,
            rescheduleStatus: '',
            staffId: booking.staffId || '',
            staffName: assignedStaff?.name || '',
            staffPhotoURL: assignedStaff?.photoURL || '',
            createdAt: FirebaseSDK.serverTimestamp(),
            createdAtMs: Date.now(),
            updatedAt: FirebaseSDK.serverTimestamp(),
            updatedAtMs: Date.now()
          }, { merge: true });
          await FirebaseSDK.addDoc(FirebaseSDK.collection(db, 'artifacts', appId, 'clientThreads', threadId, 'messages'), {
            text: `Support thread opened for ${booking.date || 'this booking'} at ${booking.time || 'the requested time'}. The team can reply, reschedule, or send updates here.`,
            kind: 'booking-linked',
            bookingId: booking.id,
            senderId: 'system',
            senderName: 'Build A Booking',
            senderRole: 'system',
            createdAt: FirebaseSDK.serverTimestamp()
          });
        }
        if (clientPhotoURL && !threadSnap.data()?.clientPhotoURL) {
          await FirebaseSDK.setDoc(threadRef, {
            clientPhotoURL,
            updatedAt: FirebaseSDK.serverTimestamp(),
            updatedAtMs: Date.now()
          }, { merge: true });
        }
        if (!booking.threadId) {
          await updateBooking(booking.id, { threadId });
        }
      } catch (error) {
        console.error('Could not open booking chat', error);
        showToast('Could not open that client chat yet.');
        return;
      }
    }

    if (!confirmLeavingUnsavedChanges()) return;
    setSupportThreadFocus({ threadId, bookingId: booking.id, requestId: Date.now() });
    setActiveTab('communications');
  };

  const openWorkspaceSupportThread = (thread) => {
    const linkedBooking = visibleBookings.find(booking => (
      booking.id === thread?.bookingId ||
      booking.threadId === thread?.id ||
      notificationEmailKey(booking.clientEmail || '') === notificationEmailKey(thread?.clientEmail || '')
    ));
    if (linkedBooking) {
      openBookingChat(linkedBooking);
      return;
    }
    if (!thread?.id) {
      navigateWorkspaceTab('communications');
      return;
    }
    if (!confirmLeavingUnsavedChanges()) return;
    setSupportThreadFocus({ threadId: thread.id, bookingId: thread.bookingId || '', requestId: Date.now() });
    setActiveTab('communications');
  };

  return {
    openBookingChat,
    openWorkspaceSupportThread
  };
}
