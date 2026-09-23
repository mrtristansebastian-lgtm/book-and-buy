self.addEventListener('push', (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { notification: { body: event.data?.text?.() || '' } };
  }
  const notification = payload.notification || {};
  const data = payload.data || {};
  const link = payload.fcmOptions?.link || notification.click_action || data.link || '/#/app/account/notifications';
  event.waitUntil(self.registration.showNotification(notification.title || 'Book and Buy', {
    body: notification.body || 'You have new social activity.',
    icon: notification.icon || '/brand/book-and-buy-mark.png',
    badge: '/brand/book-and-buy-mark.png',
    tag: data.notificationId || `${data.type || 'social'}-${data.postId || 'activity'}`,
    renotify: false,
    data: { ...data, link }
  }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const link = event.notification.data?.link || '/#/app/account/notifications';
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    const existing = windows.find((client) => 'focus' in client);
    if (existing) {
      await existing.focus();
      if ('navigate' in existing) await existing.navigate(link);
      return;
    }
    if (self.clients.openWindow) await self.clients.openWindow(link);
  })());
});
