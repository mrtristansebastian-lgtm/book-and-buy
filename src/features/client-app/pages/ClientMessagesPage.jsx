import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CalendarDays,
  MessageSquare,
  RefreshCw,
  Search
} from 'lucide-react';
import { navigate } from '../../../app/routing';
import { MessageTimeline } from '../../support/components/MessageBubble';
import { ChatComposer } from '../../support/components/ChatComposer';
import { useKeyboardInset } from '../../support/hooks/useKeyboardInset';
import { formatRelativeTime, formatPresenceLabel, messagePreview } from '../../support/utils/supportFormat';
import { buildPresence } from '../../support/utils/presence';
import { PresenceAvatar } from '../../support/components/PresenceAvatar';
import { useOwnChatPresence } from '../../support/hooks/useOwnChatPresence';
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

function lastMessage(thread) {
  const messages = thread?.messages || [];
  return messages[messages.length - 1] || null;
}

/** Client messages — same Support inbox UI, client filter set + bubble perspective. */
export function ClientMessagesPage({ threadId = '' }) {
  const { profile } = useClientProfile();
  const { threads, sendThreadMessage, markThreadRead, workspace, setClientPresence } = useWorkspace();
  const email = String(profile?.email || '').toLowerCase();
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [remoteThreads, setRemoteThreads] = useState([]);
  const [remoteMessages, setRemoteMessages] = useState([]);
  const [lightboxUrl, setLightboxUrl] = useState('');

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
  const activeName = active ? brandLabel(active, workspace) : '';
  useKeyboardInset(Boolean(active));

  useOwnChatPresence({
    enabled: Boolean(profile?.email),
    showActivity: profile?.showActivityStatus !== false,
    publish: (presence) => setClientPresence?.(profile?.email, presence)
  });

  const businessPresence = buildPresence({
    status: workspace?.presence?.status || 'offline',
    lastSeenAt: workspace?.presence?.lastSeenAt || Date.now() - 1000 * 60 * 12,
    visible: workspace?.notifications?.showActivityStatus !== false
  });

  useEffect(() => {
    if (!active?.id) return;
    if (isRemoteActive) {
      markClientThreadRead(active.id).catch(() => {});
    } else if (isUnread(active) && markThreadRead) {
      markThreadRead(active.id);
    }
  }, [active?.id, active?.unread, active?.unreadForClient, isRemoteActive, markThreadRead]);

  const sendPayload = async (payload) => {
    if (!active?.id) return;
    const next = { ...payload, from: 'client' };
    if (isRemoteActive) {
      await sendClientThreadMessage(active.id, next);
    } else if (sendThreadMessage) {
      sendThreadMessage(active.id, next);
    }
  };

  return (
    <ClientAppShell section="messages" title="Messages" unreadMessages={unreadTotal} hideHeader>
      <div className="bb-support-page bb-client-support-page">
        <section className={`bb-support-stage ${stageMode}`}>
          <aside className="bb-support-list">
            <div className="bb-support-list-head">
              <div className="bb-support-list-head-copy">
                <div className="bb-page-title-wrap">
                  <span className="bb-page-title-main">
                    <div className="bb-page-header-glow" aria-hidden="true" />
                    <h2 className="bb-page-title bb-support-inbox-title">Inbox</h2>
                  </span>
                </div>
                <p className="bb-muted m-0 text-xs mt-1">
                  Bookings, orders, and business chats
                </p>
              </div>

              <label className="bb-support-search bb-search-field">
                <Search size={15} className="bb-search-field-icon" aria-hidden="true" />
                <input
                  type="search"
                  className="native-search-input"
                  placeholder="Search"
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  aria-label="Search messages"
                  autoCapitalize="none"
                  autoCorrect="off"
                />
              </label>

              <div className="bb-support-chips" role="toolbar" aria-label="Message filters">
                {FILTERS.map(({ id, label, Icon }) => {
                  const on = filter === id;
                  return (
                    <button
                      key={id}
                      type="button"
                      className={`bb-support-filter-chip${on ? ' is-active' : ''}`}
                      aria-pressed={on}
                      aria-label={`${label}, ${counts[id] || 0}`}
                      title={label}
                      onClick={() => setFilter(id)}
                    >
                      <Icon size={15} strokeWidth={on ? 2.35 : 2} aria-hidden="true" />
                      <span className="bb-support-filter-count">{counts[id] || 0}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="bb-support-list-scroll">
              {visible.length === 0 ? (
                <div className="bb-muted p-4 m-0 text-sm">
                  <p className="m-0">
                    {mine.length === 0
                      ? 'No conversations yet. Message a business from Explore or a booking.'
                      : 'No conversations match this filter.'}
                  </p>
                  {mine.length === 0 ? (
                    <button
                      type="button"
                      className="bb-primary-btn mt-3"
                      onClick={() => navigate('/app/find')}
                    >
                      Find businesses
                    </button>
                  ) : null}
                </div>
              ) : (
                visible.map((thread) => {
                  const name = brandLabel(thread, workspace);
                  const last = lastMessage(thread);
                  const unread = isUnread(thread);
                  return (
                    <button
                      key={thread.id}
                      type="button"
                      className={`bb-support-thread${
                        thread.id === threadId ? ' is-active' : ''
                      }${unread ? ' is-unread' : ''}`}
                      onClick={() => navigate(`/app/messages/${thread.id}`)}
                    >
                      <PresenceAvatar
                        name={name}
                        photoUrl={thread.logoUrl || ''}
                        presence={businessPresence}
                        className="support-thread-icon-chip"
                        size="sm"
                      />
                      <span className="bb-support-thread-copy">
                        <strong>{name}</strong>
                        <p className="bb-support-thread-preview support-thread-preview">
                          {messagePreview(last) ||
                            thread.lastMessagePreview ||
                            thread.subject ||
                            'Say hello…'}
                        </p>
                      </span>
                      <span className="bb-support-thread-meta">
                        <span className="bb-support-thread-time">
                          {formatRelativeTime(thread.updatedAt)}
                        </span>
                        {unread ? (
                          <span
                            className="bb-support-unread support-thread-unread-count"
                            aria-label="Unread"
                          >
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

          {active ? (
            <div className="bb-support-pane">
              <header className="bb-support-header">
                <div className="bb-support-header-main">
                  <button
                    type="button"
                    className="bb-ghost-btn px-3 py-2 bb-client-support-back"
                    aria-label="Back to inbox"
                    onClick={() => navigate('/app/messages')}
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <PresenceAvatar
                    name={activeName}
                    photoUrl={active.logoUrl || ''}
                    presence={businessPresence}
                  />
                  <div className="bb-support-header-copy">
                    <h2>{activeName}</h2>
                    <p className="support-presence-label bb-support-presence-label">
                      {[formatPresenceLabel(businessPresence), active.subject || 'Direct message']
                        .filter(Boolean)
                        .join(' · ')}
                    </p>
                  </div>
                </div>
              </header>

              {activeMessages.length === 0 ? (
                <div className="bb-support-timeline">
                  <p className="bb-muted m-0 text-sm px-4 py-6 text-center">
                    Say hi to {activeName}. They usually reply here.
                  </p>
                </div>
              ) : (
                <MessageTimeline
                  messages={activeMessages}
                  perspective="client"
                  onOpenImage={setLightboxUrl}
                />
              )}

              <ChatComposer threadId={active.id} onSend={sendPayload} />

              {lightboxUrl ? (
                <button
                  type="button"
                  className="bb-support-lightbox border-0"
                  onClick={() => setLightboxUrl('')}
                  aria-label="Close image"
                >
                  <img src={lightboxUrl} alt="" />
                </button>
              ) : null}
            </div>
          ) : (
            <div className="bb-support-pane">
              <div className="bb-support-empty">
                <p className="bb-page-title text-xl m-0">Select a conversation</p>
                <p className="bb-muted m-0 text-sm">
                  Message a business from Explore, or open a booking chat.
                </p>
              </div>
            </div>
          )}
        </section>
      </div>
    </ClientAppShell>
  );
}
