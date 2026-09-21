import { useEffect, useMemo, useState } from 'react';
import { Bell } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { SocialNotificationsList } from '../components/SocialNotificationsList';
import {
  canUseCanonicalSocial,
  socialMutations,
  subscribeBusinessSocialNotifications
} from '../socialApi';
import { DEMO_BUSINESS_SOCIAL_NOTIFICATIONS } from '../demoSocialData';

export function SocialNotificationsPage() {
  const { workspace } = useWorkspace();
  const [notifications, setNotifications] = useState([]);
  const [ready, setReady] = useState(false);
  const ownerId = workspace.ownerId || '';

  useEffect(() => {
    if (workspace.isDemo || !canUseCanonicalSocial(ownerId)) {
      setNotifications(DEMO_BUSINESS_SOCIAL_NOTIFICATIONS.map((item) => ({ ...item })));
      setReady(true);
      return undefined;
    }
    setReady(false);
    return subscribeBusinessSocialNotifications(
      ownerId,
      (items) => {
        setNotifications(items);
        setReady(true);
      },
      () => setReady(true)
    );
  }, [ownerId, workspace.isDemo]);

  const unread = useMemo(
    () => notifications.filter((item) => !item.readAtMs).length,
    [notifications]
  );

  const markRead = async (ids = [], all = false) => {
    const targets = new Set(ids);
    const readAtMs = Date.now();
    setNotifications((current) => current.map((item) => (
      all || targets.has(item.id) ? { ...item, readAtMs: item.readAtMs || readAtMs } : item
    )));
    if (canUseCanonicalSocial(ownerId)) {
      await socialMutations
        .markNotificationsRead({ ids, all, audience: 'business', ownerId })
        .catch(() => {});
    }
  };

  return (
    <main className="bb-social-notifications-page">
      <header className="bb-social-notifications-page-head">
        <span className="bb-social-notifications-page-icon"><Bell size={22} /></span>
        <div>
          <p>Social</p>
          <h1>Notifications</h1>
          <span>{unread ? `${unread} unread activit${unread === 1 ? 'y' : 'ies'}` : 'You are all caught up'}</span>
        </div>
      </header>
      <SocialNotificationsList
        items={notifications}
        loading={!ready}
        onMarkRead={(ids) => markRead(ids)}
        onMarkAllRead={() => markRead([], true)}
        emptyCopy="Likes, comments, shares, and new followers will appear here."
      />
    </main>
  );
}
