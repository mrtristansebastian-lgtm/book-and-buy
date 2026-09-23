import { Bell, Heart, MessageCircle, Share2, UserPlus } from 'lucide-react';
import { navigate, publicItemPath } from '../../../app/routing';

function relativeTime(value) {
  const delta = Math.max(0, Date.now() - Number(value || 0));
  const minutes = Math.floor(delta / 60_000);
  if (minutes < 1) return 'Now';
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(Number(value || 0))
  );
}

function notificationCopy(item) {
  const count = Math.max(1, Number(item.groupedCount || 1));
  if (item.type === 'post_like') {
    return count > 1 ? `and ${count - 1} others liked your post.` : 'liked your post.';
  }
  if (item.type === 'post_share') {
    return count > 1 ? `and ${count - 1} others shared your post.` : 'shared your post.';
  }
  if (item.type === 'post_comment') return 'commented on your post.';
  if (item.type === 'comment_reply') return 'replied to your comment.';
  if (item.type === 'comment_like') {
    return count > 1 ? `and ${count - 1} others liked your comment.` : 'liked your comment.';
  }
  if (item.type === 'business_follow') return 'started following your business.';
  return 'sent you a social update.';
}

function NotificationIcon({ type }) {
  const Icon =
    type === 'post_like' || type === 'comment_like'
      ? Heart
      : type === 'post_share'
        ? Share2
        : type === 'business_follow'
          ? UserPlus
          : MessageCircle;
  return <Icon size={13} strokeWidth={2.2} aria-hidden="true" />;
}

export function SocialNotificationsList({
  items = [],
  loading = false,
  loadingMore = false,
  hasMore = false,
  onLoadMore,
  onMarkRead,
  onMarkAllRead,
  emptyTitle = 'No notifications yet',
  emptyCopy = 'New social activity will appear here.'
}) {
  const unread = items.filter((item) => !item.readAtMs).length;

  const open = (item) => {
    if (!item.readAtMs) onMarkRead?.([item.id]);
    if (item.businessSlug && item.postId) {
      navigate(publicItemPath(item.businessSlug, 'social', item.postId));
    }
  };

  if (loading) {
    return (
      <div className="bb-social-notifications-loading" aria-live="polite">
        {[0, 1, 2, 3].map((item) => (
          <span key={item} />
        ))}
      </div>
    );
  }

  return (
    <section className="bb-social-notifications" aria-label="Social notifications">
      <header className="bb-social-notifications-head">
        <div>
          <span className="bb-social-notifications-kicker">
            {unread ? `${unread} unread` : 'All read'}
          </span>
          <h2>Recent activity</h2>
        </div>
        {unread ? (
          <button type="button" className="bb-social-notifications-read-all" onClick={onMarkAllRead}>
            Mark all read
          </button>
        ) : null}
      </header>

      {!items.length ? (
        <div className="bb-social-notifications-empty">
          <Bell size={24} strokeWidth={1.8} />
          <strong>{emptyTitle}</strong>
          <p>{emptyCopy}</p>
        </div>
      ) : (
        <>
        <div className="bb-social-notification-list">
          {items.map((item) => {
            const initial = String(item.actorName || 'S').charAt(0).toUpperCase();
            return (
              <button
                key={item.id}
                type="button"
                className={`bb-social-notification-row${item.readAtMs ? '' : ' is-unread'}`}
                onClick={() => open(item)}
              >
                <span className="bb-social-notification-avatar-wrap">
                  {item.actorPhotoURL ? (
                    <img src={item.actorPhotoURL} alt="" className="bb-social-notification-avatar" />
                  ) : (
                    <span className="bb-social-notification-avatar is-fallback" aria-hidden="true">
                      {initial}
                    </span>
                  )}
                  <span className="bb-social-notification-type">
                    <NotificationIcon type={item.type} />
                  </span>
                </span>

                <span className="bb-social-notification-copy">
                  <span>
                    <strong>{item.actorName || 'Someone'}</strong> {notificationCopy(item)}
                  </span>
                  {item.preview ? <small>{item.preview}</small> : null}
                  <time dateTime={new Date(Number(item.createdAtMs || 0)).toISOString()}>
                    {relativeTime(item.createdAtMs)}
                  </time>
                </span>

                {item.thumbnailUrl ? (
                  <img src={item.thumbnailUrl} alt="" className="bb-social-notification-thumb" />
                ) : (
                  <span className="bb-social-notification-arrow" aria-hidden="true">›</span>
                )}
                {!item.readAtMs ? <span className="bb-social-notification-unread" aria-label="Unread" /> : null}
              </button>
            );
          })}
        </div>
        {hasMore ? (
          <button
            type="button"
            className="bb-social-notifications-load-more"
            onClick={onLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? 'Loading activity…' : 'Load earlier activity'}
          </button>
        ) : null}
        </>
      )}
    </section>
  );
}
