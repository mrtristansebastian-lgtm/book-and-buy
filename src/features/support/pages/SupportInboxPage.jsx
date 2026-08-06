import { useEffect, useMemo, useState } from 'react';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function SupportInboxPage() {
  const { threads, sendThreadMessage, markThreadRead } = useWorkspace();
  const sorted = useMemo(
    () => [...threads].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)),
    [threads]
  );
  const [activeId, setActiveId] = useState(sorted[0]?.id || '');
  const [draft, setDraft] = useState('');

  const active = sorted.find((thread) => thread.id === activeId) || sorted[0] || null;

  useEffect(() => {
    if (active?.id && active.unread) markThreadRead(active.id);
  }, [active?.id, active?.unread, markThreadRead]);

  return (
    <div className="grid gap-5">
      <header className="grid gap-1">
        <h1 className="bb-page-title text-3xl m-0">Support</h1>
        <p className="bb-muted m-0">Client threads tied to bookings and questions.</p>
      </header>

      <section className="grid gap-3 lg:grid-cols-[280px_1fr] min-h-[520px]">
        <aside className="bb-panel overflow-hidden grid content-start">
          {sorted.length === 0 ? (
            <p className="bb-muted p-4 m-0 text-sm">No conversations yet.</p>
          ) : (
            sorted.map((thread) => (
              <button
                key={thread.id}
                type="button"
                className={`text-left px-4 py-3 border-0 border-b border-black/5 grid gap-1 ${
                  active?.id === thread.id ? 'bg-black/[0.03]' : 'bg-transparent'
                }`}
                onClick={() => setActiveId(thread.id)}
              >
                <div className="flex items-center justify-between gap-2">
                  <strong className="text-sm">{thread.clientName}</strong>
                  {thread.unread ? (
                    <span className="w-2 h-2 rounded-full bg-[#755cff]" aria-label="Unread" />
                  ) : null}
                </div>
                <span className="bb-muted text-xs truncate">{thread.subject}</span>
              </button>
            ))
          )}
        </aside>

        <div className="bb-panel grid grid-rows-[auto_1fr_auto] min-h-[520px]">
          {active ? (
            <>
              <div className="px-5 py-4 border-b border-black/5">
                <h2 className="bb-page-title text-xl m-0">{active.subject}</h2>
                <p className="bb-muted m-0 text-sm">
                  {active.clientName}
                  {active.clientEmail ? ` · ${active.clientEmail}` : ''}
                </p>
              </div>
              <div className="p-5 grid gap-3 content-start overflow-auto">
                {(active.messages || []).map((message) => (
                  <div
                    key={message.id}
                    className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${
                      message.from === 'business'
                        ? 'justify-self-end bg-[#050505] text-white'
                        : 'justify-self-start bg-black/[0.04]'
                    }`}
                  >
                    {message.body}
                  </div>
                ))}
              </div>
              <form
                className="p-4 border-t border-black/5 flex gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  sendThreadMessage(active.id, draft);
                  setDraft('');
                }}
              >
                <input
                  className="native-control-input px-4 flex-1"
                  placeholder="Write a reply"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                />
                <button type="submit" className="bb-primary-btn" disabled={!draft.trim()}>
                  Send
                </button>
              </form>
            </>
          ) : (
            <div className="grid place-items-center bb-muted p-8">Select a thread</div>
          )}
        </div>
      </section>
    </div>
  );
}
