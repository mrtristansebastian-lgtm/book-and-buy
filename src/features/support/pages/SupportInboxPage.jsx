import { useSupportInbox } from '../hooks/useSupportInbox';
import { ThreadList } from '../components/ThreadList';
import { ConversationPane } from '../components/ConversationPane';

export function SupportInboxPage() {
  const inbox = useSupportInbox();

  return (
    <div className="bb-support-page">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Support</h1>
          <p className="bb-muted m-0">
            Client threads with quick actions, files, voice notes, and presence.
          </p>
        </div>
        {inbox.unreadCount > 0 ? (
          <span className="bb-primary-btn py-1.5 px-3 text-xs pointer-events-none">
            {inbox.unreadCount} unread
          </span>
        ) : null}
      </header>

      <section
        className={`bb-support-stage ${inbox.mobileShowChat ? 'is-chat' : 'is-list'}`}
      >
        <ThreadList
          threads={inbox.sorted}
          activeId={inbox.active?.id}
          onSelect={inbox.selectThread}
        />
        <ConversationPane inbox={inbox} />
      </section>
    </div>
  );
}
