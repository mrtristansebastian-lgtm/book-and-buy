import { ArrowLeft, UserRound } from 'lucide-react';
import { clientInitials, formatPresenceLabel } from '../utils/supportFormat';
import { QuickActionsMenu } from './QuickActionsMenu';

export function ChatHeader({
  thread,
  showBack,
  onBack,
  onOpenClient,
  quickActionProps
}) {
  if (!thread) return null;
  const presenceLabel = formatPresenceLabel(thread.presence);
  const status = thread.presence?.status || 'offline';

  return (
    <header className="bb-support-header">
      <div className="bb-support-header-main">
        {showBack ? (
          <button type="button" className="bb-ghost-btn px-3 py-2" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
        ) : null}
        <span className="bb-support-avatar" aria-hidden="true">
          {clientInitials(thread.clientName)}
          <span
            className={`bb-support-presence-dot is-${status === 'online' || status === 'away' ? status : 'offline'}`}
          />
        </span>
        <div className="bb-support-header-copy">
          <h2>{thread.clientName}</h2>
          <p className="support-presence-label bb-support-presence-label">
            {presenceLabel}
            {thread.subject ? ` · ${thread.subject}` : ''}
          </p>
        </div>
      </div>
      <div className="bb-support-header-actions">
        <button type="button" className="bb-ghost-btn" onClick={onOpenClient}>
          <UserRound size={14} />
          Client file
        </button>
        <QuickActionsMenu {...quickActionProps} />
      </div>
    </header>
  );
}
