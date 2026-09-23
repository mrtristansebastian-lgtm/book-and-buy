import { useEffect, useMemo, useState } from 'react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { SocialNotificationsList } from '../components/SocialNotificationsList';
import { SocialNotificationControls } from '../components/SocialNotificationControls';
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
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const ownerId = workspace.ownerId || '';

  useEffect(() => {
    if (workspace.isDemo || !canUseCanonicalSocial(ownerId)) {
      setNotifications(DEMO_BUSINESS_SOCIAL_NOTIFICATIONS.map((item) => ({ ...item })));
      setReady(true);
      setHasMore(false);
      return undefined;
    }
    setReady(false);
    return subscribeBusinessSocialNotifications(
      ownerId,
      (items) => {
        setNotifications((current) => {
          const incoming = new Set(items.map((item) => item.id));
          const oldestFirstPage = Number(items.at(-1)?.createdAtMs || 0);
          const older = current.filter((item) => !incoming.has(item.id) && Number(item.createdAtMs || 0) < oldestFirstPage);
          return [...items, ...older];
        });
        setHasMore(items.length >= 30);
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

  const loadMore = async () => {
    if (!canUseCanonicalSocial(ownerId) || loadingMore || !hasMore) return;
    const last = notifications.at(-1);
    if (!last) return;
    setLoadingMore(true);
    try {
      const result = await socialMutations.listNotifications({
        audience: 'business',
        ownerId,
        cursor: { createdAtMs: last.createdAtMs, id: last.id },
        pageSize: 30
      });
      setNotifications((current) => {
        const seen = new Set(current.map((item) => item.id));
        return [...current, ...(result?.items || []).filter((item) => !seen.has(item.id))];
      });
      setHasMore(Boolean(result?.hasMore));
    } finally {
      setLoadingMore(false);
    }
  };

  return (
    <main className="bb-social-notifications-page">
      <header className="bb-ops-page-head bb-social-notifications-page-head">
        <div className="bb-page-title-wrap">
          <PageBackButton />
          <span className="bb-page-title-main">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title">Notifications</h1>
          </span>
        </div>
      </header>
      <div className="bb-social-notifications-toolbar">
        <span>{unread ? `${unread} unread activit${unread === 1 ? 'y' : 'ies'}` : 'You are all caught up'}</span>
        <SocialNotificationControls audience="business" ownerId={ownerId} demo={Boolean(workspace.isDemo)} />
      </div>
      <SocialNotificationsList
        items={notifications}
        loading={!ready}
        loadingMore={loadingMore}
        hasMore={hasMore}
        onLoadMore={loadMore}
        onMarkRead={(ids) => markRead(ids)}
        onMarkAllRead={() => markRead([], true)}
        emptyCopy="Likes, comments, shares, and new followers will appear here."
      />
    </main>
  );
}
