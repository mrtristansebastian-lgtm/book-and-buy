import { useMemo, useState } from 'react';
import {
  Box,
  CalendarDays,
  Mail,
  Clock3,
  Search
} from 'lucide-react';
import { formatRelativeTime, messagePreview } from '../utils/supportFormat';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { PresenceAvatar } from './PresenceAvatar';
import { matchesInboxFilter, toggleInboxFilter } from '../utils/threadFilters';

const FILTERS = [
  { id: 'unread', label: 'Unread', Icon: Mail },
  { id: 'pending', label: 'Pending', Icon: Clock3 },
  { id: 'bookings', label: 'Bookings', Icon: CalendarDays },
  { id: 'orders', label: 'Orders', Icon: Box }
];

function lastMessage(thread) {
  const messages = thread?.messages || [];
  return messages[messages.length - 1] || null;
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
      next[item.id] = threads.filter((thread) => matchesInboxFilter(thread, item.id)).length;
    }
    return next;
  }, [threads]);

  const visible = useMemo(
    () =>
      threads.filter(
        (thread) => matchesInboxFilter(thread, filter) && matchesQuery(thread, query)
      ),
    [threads, filter, query]
  );

  return (
    <aside className="bb-support-list">
      <div className="bb-support-list-head">
        <div className="bb-support-list-head-copy">
          <div className="bb-page-title-wrap">
            <PageBackButton />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h2 className="bb-page-title bb-support-inbox-title">Inbox</h2>
            </span>
          </div>
          <p className="bb-muted m-0 text-xs mt-1">Bookings, orders, and client messages</p>
        </div>

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

        <div className="bb-support-chips bb-support-chips--named" role="toolbar" aria-label="Inbox filters">
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
                onClick={() => setFilter((current) => toggleInboxFilter(current, id))}
              >
                <Icon size={15} strokeWidth={active ? 2.35 : 2} aria-hidden="true" />
                <span className="bb-support-filter-label">{label}</span>
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
            return (
              <button
                key={thread.id}
                type="button"
                className={`bb-support-thread ${activeId === thread.id ? 'is-active' : ''}`}
                onClick={() => onSelect(thread.id)}
              >
                <PresenceAvatar
                  name={thread.clientName}
                  presence={thread.presence}
                  className="support-thread-icon-chip"
                  size="sm"
                />
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
