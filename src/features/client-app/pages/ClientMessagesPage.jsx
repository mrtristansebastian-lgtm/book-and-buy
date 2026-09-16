import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  ExternalLink,
  MessageSquare,
  RefreshCw,
  Search,
  Send
} from 'lucide-react';
import { navigate, publicPagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';
import {
  isFirebaseConfigured,
  markClientThreadRead,
  sendClientThreadMessage,
  subscribeClientThreadsByEmail,
  subscribeThreadMessages
} from '../clientThreadsApi';

const FILTERS = [
  { id: 'all', label: 'All', Icon: MessageSquare },
  { id: 'unread', label: 'Unread', Icon: Bell },
  { id: 'bookings', label: 'Bookings', Icon: CalendarDays },
  { id: 'orders', label: 'Orders', Icon: RefreshCw }
];

function formatWhen(at) {
  if (!at) return '';
  try {
    const date = new Date(at);
    const now = new Date();
    const sameDay = date.toDateString() === now.toDateString();
    if (sameDay) {
      return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
    }
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  } catch {
    return '';
  }
}

function isUnread(thread) {
  return Boolean(thread?.unread || thread?.unreadForClient);
}

function isBookingThread(thread) {
  return Boolean(
    thread?.bookingId ||
      String(thread?.subject || '')
        .toLowerCase()
        .startsWith('re:')
  );
}

function isOrderThread(thread) {
  return Boolean(
    thread?.orderId ||
      String(thread?.subject || '')
        .toLowerCase()
        .startsWith('order')
  );
}

function matchesFilter(thread, filterId) {
  if (filterId === 'all') return true;
  if (filterId === 'unread') return isUnread(thread);
  if (filterId === 'bookings') return isBookingThread(thread);
  if (filterId === 'orders') return isOrderThread(thread);
  return true;
}

function matchesQuery(thread, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const hay = [
    thread.brandName,
    thread.subject,
    thread.workspaceSlug,
    thread.lastMessagePreview,
    ...(thread.messages || []).map((message) => message.body)
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return hay.includes(q);
}

function brandLabel(thread, workspace) {
  return thread.brandName || workspace?.brandName || thread.subject || 'Business';
}

function previewText(thread) {
  return (
    thread.lastMessagePreview ||
    (thread.messages || []).at(-1)?.body ||
    'Say hello…'
  );
}

/** Instagram-style client DMs — Support look, client chips & flows. */
export function ClientMessagesPage({ threadId = '' }) {
  const { profile } = useClientProfile();
  const { threads, sendThreadMessage, markThreadRead, workspace } = useWorkspace();
  const email = String(profile?.email || '').toLowerCase();
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [remoteThreads, setRemoteThreads] = useState([]);
  const [remoteMessages, setRemoteMessages] = useState([]);

  useEffect(() => {
    if (!email || !isFirebaseConfigured()) {
      setRemoteThreads([]);
      return undefined;
    }
    return subscribeClientThreadsByEmail(profile?.email || email, setRemoteThreads);
  }, [email, profile?.email]);

  useEffect(() => {
    if (!threadId || !isFirebaseConfigured()) {
      setRemoteMessages([]);
      return undefined;
    }
    const remote = remoteThreads.some((thread) => thread.id === threadId);
    if (!remote) {
      setRemoteMessages([]);
      return undefined;
    }
    return subscribeThreadMessages(threadId, setRemoteMessages);
  }, [threadId, remoteThreads]);

  const localMine = useMemo(
    () =>
      [...(threads || [])]
        .filter(
          (thread) =>
            String(thread.clientEmail || '').toLowerCase() === email ||
            (profile?.uid && thread.clientUid === profile.uid)
        )
        .map((thread) => ({
          ...thread,
          brandName: thread.brandName || workspace?.brandName || '',
          workspaceSlug: thread.workspaceSlug || workspace?.slug || '',
          logoUrl: thread.logoUrl || workspace?.logoUrl || workspace?.website?.logoUrl || ''
        }))
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [threads, email, profile?.uid, workspace]
  );

  const mine = useMemo(() => {
    const map = new Map();
    localMine.forEach((thread) => map.set(thread.id, thread));
    remoteThreads.forEach((thread) => {
      const existing = map.get(thread.id);
      map.set(thread.id, existing ? { ...existing, ...thread } : thread);
    });
    return [...map.values()].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }, [localMine, remoteThreads]);

  const counts = useMemo(() => {
    const next = {};
    for (const item of FILTERS) {
      next[item.id] = mine.filter((thread) => matchesFilter(thread, item.id)).length;
    }
    return next;
  }, [mine]);

  const visible = useMemo(
    () => mine.filter((thread) => matchesFilter(thread, filter) && matchesQuery(thread, query)),
    [mine, filter, query]
  );

  const active = mine.find((thread) => thread.id === threadId) || null;
  const isRemoteActive = Boolean(
    active && remoteThreads.some((thread) => thread.id === active.id)
  );
  const activeMessages = isRemoteActive
    ? remoteMessages.length
      ? remoteMessages
      : active?.messages || []
    : active?.messages || [];
  const unreadTotal = counts.unread || 0;
  const stageMode = active ? 'is-chat' : 'is-list';

  useEffect(() => {
    if (!active?.id) return;
    if (isRemoteActive) {
      markClientThreadRead(active.id).catch(() => {});
    } else if (isUnread(active) && markThreadRead) {
      markThreadRead(active.id);
    }
  }, [active?.id, active?.unread, active?.unreadForClient, isRemoteActive, markThreadRead]);

  const send = async () => {
    const body = draft.trim();
    if (!body || !active?.id) return;
    if (isRemoteActive) {
      await sendClientThreadMessage(active.id, { body, from: 'client' });
    } else if (sendThreadMessage) {
      sendThreadMessage(active.id, { body, from: 'client' });
    }
    setDraft('');
  };

  const listPane = (
    <aside className="bb-client-dm-list">
      <div className="bb-client-dm-list-head">
        <div className="bb-client-dm-list-title-row">
          <h2 className="bb-client-dm-title">Messages</h2>
          {unreadTotal > 0 ? (
            <span className="bb-client-dm-unread-pill">{unreadTotal}</span>
          ) : null}
        </div>
        <p className="bb-muted m-0 text-xs">Bookings, orders, and business chats</p>

        <label className="bb-client-dm-search">
          <Search size={15} aria-hidden="true" />
          <input
            type="search"
            placeholder="Search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Search messages"
          />
        </label>

        <div className="bb-client-dm-chips" role="toolbar" aria-label="Message filters">
          {FILTERS.map(({ id, label, Icon }) => {
            const on = filter === id;
            return (
              <button
                key={id}
                type="button"
                className={`bb-client-dm-chip${on ? ' is-active' : ''}`}
                aria-pressed={on}
                title={label}
                onClick={() => setFilter(id)}
              >
                <Icon size={14} strokeWidth={on ? 2.4 : 2} aria-hidden="true" />
                <span>{label}</span>
                <span className="bb-client-dm-chip-count">{counts[id] || 0}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bb-client-dm-thread-scroll">
        {visible.length === 0 ? (
          <div className="bb-client-dm-empty">
            <p className="m-0">
              {mine.length === 0
                ? 'No conversations yet. Message a business from Explore or a booking.'
                : 'No chats in this filter.'}
            </p>
            {mine.length === 0 ? (
              <button
                type="button"
                className="bb-primary-btn"
                onClick={() => navigate('/app/explore')}
              >
                Explore
              </button>
            ) : null}
          </div>
        ) : (
          visible.map((thread) => {
            const name = brandLabel(thread, workspace);
            const unread = isUnread(thread);
            return (
              <button
                key={thread.id}
                type="button"
                className={`bb-client-dm-thread${thread.id === threadId ? ' is-active' : ''}${
                  unread ? ' is-unread' : ''
                }`}
                onClick={() => navigate(`/app/messages/${thread.id}`)}
              >
                {thread.logoUrl ? (
                  <img src={thread.logoUrl} alt="" className="bb-client-dm-avatar" />
                ) : (
                  <span className="bb-client-dm-avatar is-fallback" aria-hidden="true">
                    {name.charAt(0).toUpperCase()}
                  </span>
                )}
                <span className="bb-client-dm-thread-copy">
                  <strong>{name}</strong>
                  <span className="bb-client-dm-thread-preview">{previewText(thread)}</span>
                </span>
                <span className="bb-client-dm-thread-meta">
                  <time>{formatWhen(thread.updatedAt)}</time>
                  {unread ? <span className="bb-client-dm-dot" aria-label="Unread" /> : null}
                </span>
              </button>
            );
          })
        )}
      </div>
    </aside>
  );

  const chatPane = active ? (
    <section className="bb-client-dm-pane">
      <header className="bb-client-dm-pane-head">
        <button
          type="button"
          className="bb-client-icon-btn"
          aria-label="Back to inbox"
          onClick={() => navigate('/app/messages')}
        >
          <ArrowLeft size={20} />
        </button>
        {active.logoUrl ? (
          <img src={active.logoUrl} alt="" className="bb-client-dm-avatar is-sm" />
        ) : (
          <span className="bb-client-dm-avatar is-sm is-fallback" aria-hidden="true">
            {brandLabel(active, workspace).charAt(0).toUpperCase()}
          </span>
        )}
        <div className="bb-client-dm-pane-title">
          <strong>{brandLabel(active, workspace)}</strong>
          <span className="bb-muted">{active.subject || 'Direct message'}</span>
        </div>
        {active.workspaceSlug || workspace?.slug ? (
          <button
            type="button"
            className="bb-client-icon-btn"
            aria-label="Open public site"
            onClick={() =>
              navigate(publicPagePath(active.workspaceSlug || workspace.slug, 'home'))
            }
          >
            <ExternalLink size={18} />
          </button>
        ) : null}
      </header>

      <div className="bb-client-dm-timeline">
        {activeMessages.length === 0 ? (
          <p className="bb-client-dm-timeline-empty">
            Say hi to {brandLabel(active, workspace)}. They usually reply here.
          </p>
        ) : (
          activeMessages.map((message) => (
            <div
              key={message.id}
              className={`bb-client-dm-bubble is-${
                message.from === 'client' ? 'me' : message.type === 'system' ? 'system' : 'them'
              }`}
            >
              <p className="m-0">{message.body}</p>
              <time>{formatWhen(message.at)}</time>
            </div>
          ))
        )}
      </div>

      <form
        className="bb-client-dm-composer"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          className="bb-client-dm-input"
          placeholder="Message…"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
        <button
          type="submit"
          className="bb-client-dm-send"
          aria-label="Send"
          disabled={!draft.trim()}
        >
          <Send size={18} />
        </button>
      </form>
    </section>
  ) : (
    <section className="bb-client-dm-pane bb-client-dm-pane--idle">
      <p className="bb-muted m-0">Select a conversation or message a business from Explore.</p>
    </section>
  );

  return (
    <ClientAppShell section="messages" title="Messages" unreadMessages={unreadTotal} hideHeader>
      <div className={`bb-client-dm-stage ${stageMode}`}>
        {listPane}
        {chatPane}
      </div>
    </ClientAppShell>
  );
}
