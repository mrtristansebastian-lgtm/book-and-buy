import { ArrowLeft, UserRound } from 'lucide-react';
import { formatPresenceLabel } from '../utils/supportFormat';
import { PresenceAvatar } from './PresenceAvatar';
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
  const subject = thread.subject ? String(thread.subject) : '';
  const subtitle = [presenceLabel, subject].filter(Boolean).join(' · ');

  return (
    <header className="bb-support-header">
      <div className="bb-support-header-main">
        {showBack ? (
          <button type="button" className="bb-ghost-btn px-3 py-2" onClick={onBack}>
            <ArrowLeft size={16} />
          </button>
        ) : null}
        <PresenceAvatar name={thread.clientName} presence={thread.presence} />
        <div className="bb-support-header-copy">
          <h2>{thread.clientName}</h2>
          {subtitle ? (
            <p className="support-presence-label bb-support-presence-label">{subtitle}</p>
          ) : null}
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
