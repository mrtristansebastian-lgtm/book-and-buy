import {
  clientInitials,
  formatRelativeTime,
  messagePreview
} from '../utils/supportFormat';

export function ThreadList({ threads, activeId, onSelect }) {
  return (
    <aside className="bb-support-list">
      <div className="bb-support-list-head">
        <h2 className="bb-page-title text-lg m-0">Inbox</h2>
        <p className="bb-muted m-0 text-xs mt-1">Bookings, orders, and client messages</p>
      </div>
      <div className="bb-support-list-scroll">
        {threads.length === 0 ? (
          <p className="bb-muted p-4 m-0 text-sm">No conversations yet.</p>
        ) : (
          threads.map((thread) => {
            const last = (thread.messages || [])[(thread.messages || []).length - 1];
            const status = thread.presence?.status || 'offline';
            return (
              <button
                key={thread.id}
                type="button"
                className={`bb-support-thread ${activeId === thread.id ? 'is-active' : ''}`}
                onClick={() => onSelect(thread.id)}
              >
                <span className="bb-support-avatar support-thread-icon-chip" aria-hidden="true">
                  {clientInitials(thread.clientName)}
                  <span
                    className={`bb-support-presence-dot is-${status === 'online' || status === 'away' ? status : 'offline'}`}
                  />
                </span>
                <span className="bb-support-thread-copy">
                  <strong>{thread.clientName}</strong>
                  <p className="bb-support-thread-preview support-thread-preview">
                    {messagePreview(last) || thread.subject}
                  </p>
                </span>
                <span className="bb-support-thread-meta">
                  <span className="bb-support-thread-time">
                    {formatRelativeTime(thread.updatedAt)}
                  </span>
                  {thread.unread ? (
                    <span className="bb-support-unread support-thread-unread-count" aria-label="Unread">
                      1
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );
}
