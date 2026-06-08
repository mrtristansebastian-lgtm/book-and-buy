export const NOTIFICATION_AUDIENCES = {
  OWNER: 'owner',
  CLIENT: 'client'
};

export const NOTIFICATION_TYPES = {
  BOOKING_REQUEST: 'booking_request',
  BOOKING_RECEIVED: 'booking_received',
  BOOKING_CONFIRMED: 'booking_confirmed',
  BOOKING_DECLINED: 'booking_declined',
  BOOKING_WAITLIST: 'booking_waitlist',
  BOOKING_RESCHEDULED: 'booking_rescheduled',
  BOOKING_REMINDER: 'booking_reminder',
  RESCHEDULE_REQUEST: 'reschedule_request',
  RUNNING_LATE: 'running_late',
  REVIEW_REQUEST: 'review_request',
  NEW_MESSAGE: 'new_message',
  BIRTHDAY_REMINDER: 'birthday_reminder'
};

export const notificationEmailKey = (email = '') => String(email || '').trim().toLowerCase();

export const browserNotificationsSupported = () => (
  typeof window !== 'undefined' &&
  typeof window.Notification !== 'undefined' &&
  window.isSecureContext !== false
);

export const getBrowserNotificationPermission = () => {
  if (!browserNotificationsSupported()) return 'unsupported';
  return window.Notification.permission;
};

export const requestBrowserNotificationPermission = async () => {
  if (!browserNotificationsSupported()) return 'unsupported';
  if (window.Notification.permission !== 'default') return window.Notification.permission;
  return window.Notification.requestPermission();
};

export const showBrowserNotification = ({ title, body, tag, url, icon = '/build-a-booking-icon.png' }) => {
  if (!browserNotificationsSupported() || window.Notification.permission !== 'granted') return false;
  try {
    const notice = new window.Notification(title || 'Build A Booking', {
      body: body || '',
      tag: tag || title || 'build-a-booking',
      icon,
      badge: icon,
      silent: false
    });
    notice.onclick = () => {
      window.focus();
      if (url) window.location.hash = url;
      notice.close();
    };
    return true;
  } catch (error) {
    console.warn('Browser notification could not be shown.', error);
    return false;
  }
};

export const formatNotificationTime = (value) => {
  const timestamp = typeof value?.toMillis === 'function'
    ? value.toMillis()
    : typeof value === 'number'
      ? value
      : Number(value || 0);
  if (!timestamp) return 'Just now';
  const diff = Math.max(0, Date.now() - timestamp);
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
};

export const makeOwnerNotification = ({
  type,
  title,
  body,
  ownerId,
  booking,
  bookingId,
  threadId,
  tab = 'bookings',
  priority = 'normal',
  metadata = {}
}) => ({
  audience: NOTIFICATION_AUDIENCES.OWNER,
  type,
  title,
  body,
  ownerId,
  bookingId: bookingId || booking?.id || '',
  threadId: threadId || booking?.threadId || '',
  clientName: booking?.clientName || metadata.clientName || '',
  clientEmail: notificationEmailKey(booking?.clientEmail || metadata.clientEmail || ''),
  priority,
  tab,
  read: false,
  createdAtMs: Date.now(),
  metadata
});

export const makeClientNotification = ({
  type,
  title,
  body,
  ownerId,
  booking,
  bookingId,
  threadId,
  view = 'bookings',
  priority = 'normal',
  metadata = {}
}) => ({
  audience: NOTIFICATION_AUDIENCES.CLIENT,
  type,
  title,
  body,
  ownerId,
  bookingId: bookingId || booking?.id || '',
  threadId: threadId || booking?.threadId || '',
  workspaceName: booking?.workspaceName || metadata.workspaceName || '',
  clientName: booking?.clientName || metadata.clientName || '',
  clientEmail: notificationEmailKey(booking?.clientEmail || metadata.clientEmail || ''),
  priority,
  view,
  read: false,
  createdAtMs: Date.now(),
  metadata
});
