import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { navigate } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';
import {
  isFirebaseConfigured,
  sendClientThreadMessage,
  subscribeClientThreadsByEmail,
  subscribeThreadMessages
} from '../clientThreadsApi';

function formatWhen(at) {
  if (!at) return '';
  try {
    return new Date(at).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

/** Client messages inbox + conversation (clientThreads by email + local demo threads). */
export function ClientMessagesPage({ threadId = '' }) {
  const { profile } = useClientProfile();
  const { threads, sendThreadMessage, markThreadRead, workspace } = useWorkspace();
  const email = String(profile?.email || '').toLowerCase();
  const [draft, setDraft] = useState('');
  const [remoteThreads, setRemoteThreads] = useState([]);
  const [remoteMessages, setRemoteMessages] = useState([]);

  useEffect(() => {
    if (!email || !isFirebaseConfigured()) {
      setRemoteThreads([]);
      return undefined;
    }
    return subscribeClientThreadsByEmail(email, setRemoteThreads);
  }, [email]);

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
        .sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [threads, email, profile?.uid]
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

  const active = mine.find((thread) => thread.id === threadId) || null;
  const isRemoteActive = Boolean(
    active && remoteThreads.some((thread) => thread.id === active.id)
  );
  const activeMessages = isRemoteActive
    ? remoteMessages.length
      ? remoteMessages
      : active?.messages || []
    : active?.messages || [];
  const unread = mine.filter((thread) => thread.unread || thread.unreadForClient).length;

  useEffect(() => {
    if (active?.id && active.unread && markThreadRead && !isRemoteActive) {
      markThreadRead(active.id);
    }
  }, [active?.id, active?.unread, markThreadRead, isRemoteActive]);

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

  if (active) {
    return (
      <ClientAppShell section="messages" title="Messages" unreadMessages={unread}>
        <div className="bb-client-chat">
          <header className="bb-client-chat-head">
            <button
              type="button"
              className="bb-client-icon-btn"
              aria-label="Back"
              onClick={() => navigate('/app/messages')}
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <strong>
                {active.brandName || workspace?.brandName || active.subject || 'Business'}
              </strong>
              <p className="bb-muted m-0 text-sm">{active.subject}</p>
            </div>
          </header>
          <div className="bb-client-chat-thread">
            {activeMessages.map((message) => (
              <div
                key={message.id}
                className={`bb-client-bubble is-${message.from === 'client' ? 'me' : 'them'}${
                  message.type === 'system' ? ' is-system' : ''
                }`}
              >
                <p className="m-0">{message.body}</p>
                <time>{formatWhen(message.at)}</time>
              </div>
            ))}
          </div>
          <form
            className="bb-client-composer"
            onSubmit={(event) => {
              event.preventDefault();
              send();
            }}
          >
            <input
              className="native-control-input px-4"
              placeholder="Message…"
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
            />
            <button type="submit" className="bb-client-send" aria-label="Send" disabled={!draft.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      </ClientAppShell>
    );
  }

  return (
    <ClientAppShell section="messages" title="Messages" unreadMessages={unread}>
      <div className="bb-client-stack">
        {mine.length === 0 ? (
          <p className="bb-client-empty">
            No conversations yet. Message a business from Explore or from a booking in Account.
          </p>
        ) : (
          mine.map((thread) => (
            <button
              key={thread.id}
              type="button"
              className={`bb-client-inbox-row${
                thread.unread || thread.unreadForClient ? ' is-unread' : ''
              }`}
              onClick={() => navigate(`/app/messages/${thread.id}`)}
            >
              <div className="bb-client-avatar is-sm" aria-hidden="true">
                {(thread.brandName || workspace?.brandName || 'B').charAt(0)}
              </div>
              <div className="bb-client-inbox-copy">
                <strong>
                  {thread.subject || thread.brandName || workspace?.brandName || 'Conversation'}
                </strong>
                <span className="bb-muted">
                  {thread.lastMessagePreview ||
                    (thread.messages || []).at(-1)?.body ||
                    'No messages yet'}
                </span>
              </div>
              <time className="bb-muted text-xs">{formatWhen(thread.updatedAt)}</time>
            </button>
          ))
        )}
      </div>
    </ClientAppShell>
  );
}
