import { useCallback, useEffect, useRef, useState } from 'react';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import {
  getBrowserNotificationPermission,
  makeOwnerNotification,
  notificationEmailKey,
  requestBrowserNotificationPermission,
  showBrowserNotification,
  NOTIFICATION_TYPES
} from '../../../services/notifications';

const dateValueToMs = (value) => {
  if (typeof value?.toMillis === 'function') return value.toMillis();
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const parseBirthday = (birthday = '') => {
  const parts = String(birthday || '').match(/\d{1,2}/g);
  if (!parts || parts.length < 2) return null;
  const first = Number(parts[0]);
  const second = Number(parts[1]);
  if (!Number.isFinite(first) || !Number.isFinite(second)) return null;
  if (first > 12) return { day: first, month: second };
  if (second > 12) return { day: second, month: first };
  return { month: first, day: second };
};

export function useWorkspaceNotifications({
  clientDirectory,
  isGuestWorkspace,
  navigateWorkspaceTab,
  publicSlug,
  setEditorTab,
  showToast,
  user,
  workspaceOwnerId
}) {
  const [ownerNotifications, setOwnerNotifications] = useState([]);
  const [workspaceClientThreads, setWorkspaceClientThreads] = useState([]);
  const [browserNotificationPermission, setBrowserNotificationPermission] = useState(getBrowserNotificationPermission);
  const ownerNotificationSeenRef = useRef(new Set());
  const ownerNotificationsReadyRef = useRef(false);

  const createOwnerNotification = useCallback(async (payload, options = {}) => {
    const ownerId = payload?.ownerId || workspaceOwnerId;
    if (!isFirebaseConfigured || !db || !ownerId) return false;
    const notification = {
      ...payload,
      ownerId,
      audience: 'owner',
      read: Boolean(payload?.read),
      createdAtMs: payload?.createdAtMs || Date.now(),
      createdAt: FirebaseSDK.serverTimestamp()
    };
    try {
      const collectionRef = FirebaseSDK.collection(db, 'artifacts', appId, 'users', ownerId, 'notifications');
      if (options.id) {
        await FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'users', ownerId, 'notifications', options.id), notification, { merge: true });
      } else {
        await FirebaseSDK.addDoc(collectionRef, notification);
      }
      return true;
    } catch (error) {
      console.error('Owner notification write failed', error);
      return false;
    }
  }, [workspaceOwnerId]);

  const createClientNotification = useCallback(async (email, payload, options = {}) => {
    const emailKey = notificationEmailKey(email || payload?.clientEmail);
    if (!isFirebaseConfigured || !db || !emailKey) return false;
    const notification = {
      ...payload,
      clientEmail: emailKey,
      ownerId: payload?.ownerId || workspaceOwnerId,
      audience: 'client',
      read: Boolean(payload?.read),
      createdAtMs: payload?.createdAtMs || Date.now(),
      createdAt: FirebaseSDK.serverTimestamp()
    };
    try {
      const collectionRef = FirebaseSDK.collection(db, 'artifacts', appId, 'clientAccess', emailKey, 'notifications');
      if (options.id) {
        await FirebaseSDK.setDoc(FirebaseSDK.doc(db, 'artifacts', appId, 'clientAccess', emailKey, 'notifications', options.id), notification, { merge: true });
      } else {
        await FirebaseSDK.addDoc(collectionRef, notification);
      }
      return true;
    } catch (error) {
      console.error('Client notification write failed', error);
      return false;
    }
  }, [workspaceOwnerId]);

  const requestOwnerBrowserNotifications = useCallback(async () => {
    const permission = await requestBrowserNotificationPermission();
    setBrowserNotificationPermission(permission);
    if (permission === 'granted') {
      showToast('Browser notifications are on.');
      showBrowserNotification({
        title: 'Build A Booking alerts are on',
        body: 'New bookings, chats, and reminders can now reach this device.',
        tag: 'build-a-booking-permission'
      });
      return;
    }
    if (permission === 'denied') showToast('Browser notifications are blocked in this browser.');
    else showToast('Browser notifications are not supported here.');
  }, [showToast]);

  const markOwnerNotificationRead = useCallback(async (notificationId) => {
    if (!notificationId || !isFirebaseConfigured || !db || !workspaceOwnerId) return;
    setOwnerNotifications(prev => prev.map(item => item.id === notificationId ? { ...item, read: true } : item));
    await FirebaseSDK.updateDoc(
      FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'notifications', notificationId),
      { read: true, readAt: FirebaseSDK.serverTimestamp() }
    ).catch(error => console.error('Notification read update failed', error));
  }, [workspaceOwnerId]);

  const markAllOwnerNotificationsRead = useCallback(async () => {
    const unread = ownerNotifications.filter(item => !item.read);
    if (!unread.length || !isFirebaseConfigured || !db || !workspaceOwnerId) return;
    setOwnerNotifications(prev => prev.map(item => ({ ...item, read: true })));
    await Promise.all(unread.slice(0, 40).map(notification => FirebaseSDK.updateDoc(
      FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspaceOwnerId, 'notifications', notification.id),
      { read: true, readAt: FirebaseSDK.serverTimestamp() }
    ).catch(error => console.error('Notification read update failed', error))));
  }, [ownerNotifications, workspaceOwnerId]);

  const openOwnerNotification = useCallback((notification) => {
    if (notification?.tab) navigateWorkspaceTab(notification.tab, notification.editorTab);
    else if (notification?.editorTab) setEditorTab(notification.editorTab);
  }, [navigateWorkspaceTab, setEditorTab]);

  const resetWorkspaceNotifications = useCallback(() => {
    setOwnerNotifications([]);
    setWorkspaceClientThreads([]);
    ownerNotificationSeenRef.current = new Set();
    ownerNotificationsReadyRef.current = false;
  }, []);

  useEffect(() => {
    const syncPermission = () => setBrowserNotificationPermission(getBrowserNotificationPermission());
    syncPermission();
    window.addEventListener('focus', syncPermission);
    document.addEventListener('visibilitychange', syncPermission);
    return () => {
      window.removeEventListener('focus', syncPermission);
      document.removeEventListener('visibilitychange', syncPermission);
    };
  }, []);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user || !workspaceOwnerId || publicSlug) {
      setOwnerNotifications([]);
      ownerNotificationSeenRef.current = new Set();
      ownerNotificationsReadyRef.current = false;
      return undefined;
    }
    const notificationsQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'users', workspaceOwnerId, 'notifications'),
      FirebaseSDK.orderBy('createdAtMs', 'desc'),
      FirebaseSDK.limit(60)
    );
    const unsubscribe = FirebaseSDK.onSnapshot(notificationsQuery, (snap) => {
      const nextNotifications = snap.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
      setOwnerNotifications(nextNotifications);

      const freshNotifications = nextNotifications.filter(notification => !ownerNotificationSeenRef.current.has(notification.id));
      freshNotifications.forEach(notification => ownerNotificationSeenRef.current.add(notification.id));
      if (ownerNotificationsReadyRef.current) {
        freshNotifications
          .filter(notification => !notification.read)
          .reverse()
          .forEach(notification => {
            if (document.visibilityState !== 'visible' || notification.priority === 'high') {
              showBrowserNotification({
                title: notification.title,
                body: notification.body,
                tag: `owner-${notification.id}`,
                url: notification.tab ? `/dashboard/${notification.tab}` : '/dashboard/overview'
              });
            }
          });
      }
      ownerNotificationsReadyRef.current = true;
    }, (error) => console.error('Owner notifications sync failed', error));
    return () => unsubscribe();
  }, [user?.uid, workspaceOwnerId, publicSlug]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user || !workspaceOwnerId || publicSlug || isGuestWorkspace) {
      setWorkspaceClientThreads([]);
      return undefined;
    }
    const threadsQuery = FirebaseSDK.query(
      FirebaseSDK.collection(db, 'artifacts', appId, 'clientThreads'),
      FirebaseSDK.where('ownerId', '==', workspaceOwnerId),
      FirebaseSDK.orderBy('updatedAtMs', 'desc'),
      FirebaseSDK.limit(40)
    );
    const unsubscribe = FirebaseSDK.onSnapshot(threadsQuery, (snap) => {
      if (snap.empty) {
        FirebaseSDK.getDocs(FirebaseSDK.query(
          FirebaseSDK.collection(db, 'artifacts', appId, 'clientThreads'),
          FirebaseSDK.where('ownerId', '==', workspaceOwnerId),
          FirebaseSDK.limit(40)
        )).then((fallbackSnap) => {
          const fallbackThreads = fallbackSnap.docs
            .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
            .sort((a, b) => (
              dateValueToMs(b.updatedAtMs || b.lastMessageAt || b.updatedAt || b.createdAt) -
              dateValueToMs(a.updatedAtMs || a.lastMessageAt || a.updatedAt || a.createdAt)
            ))
            .slice(0, 40);
          setWorkspaceClientThreads(fallbackThreads);
        }).catch(handleSyncError('Workspace client thread fallback'));
        return;
      }
      const nextThreads = snap.docs
        .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
        .sort((a, b) => (
          dateValueToMs(b.updatedAtMs || b.lastMessageAt || b.updatedAt || b.createdAt) -
          dateValueToMs(a.updatedAtMs || a.lastMessageAt || a.updatedAt || a.createdAt)
        ))
        .slice(0, 40);
      setWorkspaceClientThreads(nextThreads);
    }, (error) => console.error('Workspace client threads sync failed', error));
    return () => unsubscribe();
  }, [user?.uid, workspaceOwnerId, publicSlug, isGuestWorkspace]);

  useEffect(() => {
    if (!isFirebaseConfigured || !db || !user || !workspaceOwnerId || !clientDirectory.length) return;
    const today = new Date();
    const todayMonth = today.getMonth() + 1;
    const todayDay = today.getDate();
    const year = today.getFullYear();

    clientDirectory.forEach(client => {
      if (client.isExample || !client.birthday) return;
      const parsed = parseBirthday(client.birthday);
      if (!parsed || parsed.month !== todayMonth || parsed.day !== todayDay) return;
      createOwnerNotification(makeOwnerNotification({
        type: NOTIFICATION_TYPES.BIRTHDAY_REMINDER,
        title: `${client.name}'s birthday is today`,
        body: 'A small birthday note can turn a client profile into a relationship.',
        ownerId: workspaceOwnerId,
        tab: 'clients',
        priority: 'normal',
        metadata: { clientId: client.id, birthday: client.birthday }
      }), { id: `birthday-${year}-${client.id}` });
    });
  }, [clientDirectory, createOwnerNotification, user?.uid, workspaceOwnerId]);

  return {
    browserNotificationPermission,
    createClientNotification,
    createOwnerNotification,
    markAllOwnerNotificationsRead,
    markAllWorkspaceNotificationsRead: markAllOwnerNotificationsRead,
    markOwnerNotificationRead,
    markWorkspaceNotificationRead: markOwnerNotificationRead,
    openOwnerNotification,
    ownerNotifications,
    requestOwnerBrowserNotifications,
    resetWorkspaceNotifications,
    workspaceClientThreads,
    workspaceNotifications: ownerNotifications,
    workspaceSupportThreads: workspaceClientThreads
  };
}
