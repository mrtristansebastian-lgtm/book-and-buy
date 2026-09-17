import { useSupportInbox } from '../hooks/useSupportInbox';
import { useKeyboardInset } from '../hooks/useKeyboardInset';
import { useOwnChatPresence } from '../hooks/useOwnChatPresence';
import { ThreadList } from '../components/ThreadList';
import { ConversationPane } from '../components/ConversationPane';
import { useWorkspace } from '../../workspace/WorkspaceContext';

export function SupportInboxPage() {
  const inbox = useSupportInbox();
  const { workspace, setWorkspacePresence } = useWorkspace();
  useKeyboardInset(Boolean(inbox.mobileShowChat));
  useOwnChatPresence({
    enabled: true,
    showActivity: workspace?.notifications?.showActivityStatus !== false,
    publish: (presence) => setWorkspacePresence?.(presence)
  });

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
