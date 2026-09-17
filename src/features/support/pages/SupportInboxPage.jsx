import { useSupportInbox } from '../hooks/useSupportInbox';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { ThreadList } from '../components/ThreadList';
import { ConversationPane } from '../components/ConversationPane';

export function SupportInboxPage() {
  const inbox = useSupportInbox();
  useKeyboardInset(Boolean(inbox.mobileShowChat));

  return (
    <div className="bb-support-page">
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
