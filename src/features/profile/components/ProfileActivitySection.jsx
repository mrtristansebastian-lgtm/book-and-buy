import {
  Bell,
  BookOpenCheck,
  BriefcaseBusiness,
  CalendarDays,
  DollarSign,
  FileText,
  Inbox,
  MessagesSquare,
  Palette,
  RefreshCw,
  Settings2,
  UsersRound
} from 'lucide-react';
import { formatNotificationTime } from '../../../services/notifications';

const getActivityIcon = (item = {}) => {
  if (item.iconKind === 'chat') return MessagesSquare;
  if (item.iconKind === 'payment') return DollarSign;
  if (item.iconKind === 'booking') return BookOpenCheck;
  if (item.iconKind === 'reschedule') return RefreshCw;
  if (item.iconKind === 'services') return BriefcaseBusiness;
  if (item.iconKind === 'team') return UsersRound;
  if (item.iconKind === 'schedule') return CalendarDays;
  if (item.iconKind === 'editor') return Palette;
  if (item.iconKind === 'migration') return FileText;
  return Bell;
};

export const ProfileActivitySection = ({
  activeProfileSection,
  onActivityOpen,
  onSystemFilterChange,
  profileActivityPrimaryCount,
  profileActivityRows,
  profileActivitySecondaryCount,
  profileSystemFilter,
  profileSystemFilterOptions
}) => (
  <section className={`profile-section profile-section-activity ${activeProfileSection === 'activity' ? 'block' : 'hidden'}`}>
    <div className="profile-activity-center">
      <div className="profile-activity-hero">
        <div className="profile-activity-title">
          <span className="profile-activity-icon">
            <Settings2 size={18} />
          </span>
          <div>
            <p>Activity Center</p>
            <h3>System activity</h3>
          </div>
        </div>
        <div className="profile-activity-stats">
          <span>
            <strong>{profileActivityPrimaryCount}</strong>
            Signals
          </span>
          <span>
            <strong>{profileActivitySecondaryCount}</strong>
            Areas
          </span>
        </div>
      </div>
      <div className="profile-activity-summary">
        <span><Settings2 size={14} /> Internal changes, team setup, services, schedule, editor, finance, and migration signals.</span>
      </div>
      <div className="profile-activity-filter-tabs" aria-label="System activity filters">
        {profileSystemFilterOptions.map(option => {
          const isActive = profileSystemFilter === option.id;
          return (
            <button
              key={`system-${option.id}`}
              type="button"
              className={isActive ? 'is-active' : ''}
              onClick={() => onSystemFilterChange(option.id)}
            >
              <span>{option.label}</span>
              <strong>{option.count}</strong>
            </button>
          );
        })}
      </div>
      <div className="profile-activity-list">
        {profileActivityRows.length ? profileActivityRows.map(item => {
          const IconCmp = getActivityIcon(item);
          return (
            <button
              key={item.id}
              type="button"
              className={`profile-activity-row ${item.isUnread ? 'is-unread' : ''} is-${item.kind}`}
              onClick={() => onActivityOpen(item)}
            >
              <span className={`profile-activity-row-icon is-${item.iconKind || item.kind}`}>
                <IconCmp size={15} />
              </span>
              <span className="profile-activity-row-copy">
                <strong>{item.title}</strong>
                <small>{item.detail}</small>
              </span>
              <span className="profile-activity-row-meta">
                <span>{item.label}</span>
                <small>{formatNotificationTime(item.time)}</small>
              </span>
            </button>
          );
        }) : (
          <div className="profile-activity-empty">
            <span><Inbox size={22} /></span>
            <strong>Nothing waiting</strong>
            <small>System changes and internal workspace updates will collect here.</small>
          </div>
        )}
      </div>
    </div>
  </section>
);
