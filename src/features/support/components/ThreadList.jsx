import { useMemo, useState } from 'react';
import {
  Bell,
  CalendarDays,
  Check,
  Clock3,
  MessageSquare,
  RefreshCw,
  Search
} from 'lucide-react';
import {
  clientInitials,
  formatRelativeTime,
  messagePreview
} from '../utils/supportFormat';

const FILTERS = [
  { id: 'all', label: 'All messages', Icon: MessageSquare },
  { id: 'unread', label: 'Unread', Icon: Bell },
  { id: 'bookings', label: 'Bookings', Icon: CalendarDays },
  { id: 'replied', label: 'Replied', Icon: Check },
  { id: 'waiting', label: 'Waiting', Icon: Clock3 },
  { id: 'orders', label: 'Orders', Icon: RefreshCw }
];

function lastMessage(thread) {
  const messages = thread?.messages || [];
  return messages[messages.length - 1] || null;
}

function matchesFilter(thread, filterId) {
  if (filterId === 'all') return true;
  if (filterId === 'unread') return Boolean(thread.unread);
  if (filterId === 'bookings') return Boolean(thread.bookingId);
  if (filterId === 'orders') return Boolean(thread.orderId);
  const last = lastMessage(thread);
  if (filterId === 'waiting') return last?.from === 'client';
  if (filterId === 'replied') return last?.from === 'business' || last?.from === 'system';
  return true;
}

function matchesQuery(thread, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const haystack = [
    thread.clientName,
    thread.clientEmail,
    thread.subject,
    ...(thread.messages || []).map((message) => message.body)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(q);
}

export function ThreadList({ threads, activeId, onSelect }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');

  const counts = useMemo(() => {
    const next = {};
    for (const item of FILTERS) {
      next[item.id] = threads.filter((thread) => matchesFilter(thread, item.id)).length;
    }
    return next;
  }, [threads]);

  const visible = useMemo(
    () =>
      threads.filter(
        (thread) => matchesFilter(thread, filter) && matchesQuery(thread, query)
      ),
    [threads, filter, query]
  );

  return (
    <aside className="bb-support-list">
      <div className="bb-support-list-head">
        <h2 className="bb-page-title text-lg m-0">Inbox</h2>
        <p className="bb-muted m-0 text-xs mt-1">Bookings, orders, and client messages</p>

        <label className="bb-support-search bb-search-field">
          <Search size={15} className="bb-search-field-icon" aria-hidden="true" />
          <input
            type="search"
            className="native-search-input"
            placeholder="Search client, email, message"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search inbox"
          />
        </label>

        <div className="bb-support-chips" role="toolbar" aria-label="Inbox filters">
          {FILTERS.map(({ id, label, Icon }) => {
            const active = filter === id;
            return (
              <button
                key={id}
                type="button"
                className={`bb-support-filter-chip${active ? ' is-active' : ''}`}
                aria-pressed={active}
                aria-label={`${label}, ${counts[id] || 0}`}
                title={label}
                onClick={() => setFilter(id)}
              >
                <Icon size={15} strokeWidth={active ? 2.35 : 2} aria-hidden="true" />
                <span className="bb-support-filter-count">{counts[id] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bb-support-list-scroll">
        {visible.length === 0 ? (
          <p className="bb-muted p-4 m-0 text-sm">
            {threads.length === 0 ? 'No conversations yet.' : 'No conversations match this filter.'}
          </p>
        ) : (
          visible.map((thread) => {
            const last = lastMessage(thread);
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
