import { clientInitials } from '../utils/supportFormat';
import {
  isPresenceVisible,
  normalizePresenceStatus
} from '../utils/presence';

/** Avatar with optional online/offline presence ring-dot (hidden when activity sharing is off). */
export function PresenceAvatar({
  name = '',
  photoUrl = '',
  presence = null,
  className = '',
  size = 'md'
}) {
  const showDot = isPresenceVisible(presence);
  const status = normalizePresenceStatus(presence?.status);
  const sizeClass = size === 'sm' ? ' is-sm' : size === 'lg' ? ' is-lg' : '';

  return (
    <span
      className={`bb-support-avatar${sizeClass}${className ? ` ${className}` : ''}`}
      aria-hidden="true"
    >
      <span className="bb-support-avatar-face">
        {photoUrl ? <img src={photoUrl} alt="" /> : clientInitials(name)}
      </span>
      {showDot ? (
        <span
          className={`bb-support-presence-dot is-${status}`}
          title={status === 'online' ? 'Online' : 'Offline'}
        />
      ) : null}
    </span>
  );
}
