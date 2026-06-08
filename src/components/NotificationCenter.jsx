import { useMemo, useState } from 'react';
import { Bell, BellRing, CheckCheck, ChevronRight, Inbox, X } from 'lucide-react';
import { formatNotificationTime } from '../services/notifications';

const permissionCopy = {
  granted: 'Browser alerts on',
  denied: 'Browser alerts blocked',
  default: 'Allow browser alerts',
  unsupported: 'In-app only'
};

export function NotificationCenter({
  title = 'Notifications',
  subtitle = 'Bookings, chats, and useful updates.',
  notifications = [],
  permission = 'default',
  onRequestPermission,
  onMarkRead,
  onMarkAllRead,
  onOpenNotification,
  compact = false
}) {
  const [open, setOpen] = useState(false);
  const unreadCount = useMemo(() => notifications.filter(item => !item.read).length, [notifications]);
  const visibleNotifications = notifications.slice(0, 40);

  const handleOpenNotification = (notification) => {
    if (!notification.read) onMarkRead?.(notification.id);
    onOpenNotification?.(notification);
    setOpen(false);
  };

  return (
    <div className={`notification-center fixed ${compact ? 'notification-center-compact top-[4.75rem] right-3 md:top-24 md:right-6' : 'top-4 right-4 md:top-6 md:right-6'} z-[180]`}>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="relative h-12 w-12 rounded-full bg-white/92 backdrop-blur-xl border border-neutral-200 shadow-2xl shadow-black/10 flex items-center justify-center text-black hover:-translate-y-0.5 transition-all"
        aria-label="Open notifications"
      >
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full native-gradient-button text-[9px] font-black flex items-center justify-center shadow-lg">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="notification-overlay fixed inset-0 z-[181] flex items-start justify-end bg-black/10 backdrop-blur-[2px]" onClick={() => setOpen(false)}>
          <aside
            className="notification-panel m-3 md:m-5 w-[calc(100vw-1.5rem)] max-w-md max-h-[calc(100vh-1.5rem)] md:max-h-[calc(100vh-2.5rem)] overflow-hidden rounded-[1.35rem] md:rounded-2xl bg-white shadow-2xl shadow-black/20 border border-neutral-200 flex flex-col"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="h-1 native-gradient-line shrink-0" />
            <header className="notification-panel-head p-5 border-b border-neutral-100">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="notification-panel-icon w-11 h-11 rounded-xl native-gradient-icon flex items-center justify-center mb-4">
                    <BellRing size={18} />
                  </div>
                  <p className="notification-panel-kicker text-[9px] font-bold uppercase tracking-[0.35em] text-neutral-400 mb-2">Alert Center</p>
                  <h2 className="notification-panel-title text-2xl font-bold tracking-tight text-black">{title}</h2>
                  <p className="notification-panel-subtitle text-sm text-neutral-500 mt-1 leading-relaxed">{subtitle}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="notification-panel-close h-10 w-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black">
                  <X size={16} />
                </button>
              </div>
              <div className="notification-panel-actions mt-5 grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={onRequestPermission}
                  disabled={permission === 'granted' || permission === 'unsupported'}
                  className="notification-panel-permission h-11 rounded-full bg-neutral-50 border border-neutral-100 text-[9px] font-bold uppercase tracking-widest text-black disabled:text-neutral-400 disabled:cursor-default"
                >
                  {permissionCopy[permission] || 'Allow alerts'}
                </button>
                <button
                  type="button"
                  onClick={onMarkAllRead}
                  disabled={!unreadCount}
                  className="notification-panel-clear h-11 rounded-full bg-black text-white text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 disabled:opacity-25 disabled:cursor-default"
                >
                  <CheckCheck size={14} /> Clear
                </button>
              </div>
            </header>

            <div className="notification-panel-list overflow-y-auto p-3 space-y-2">
              {visibleNotifications.length ? visibleNotifications.map(notification => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => handleOpenNotification(notification)}
                  className={`notification-card group w-full text-left rounded-2xl border p-4 transition-all ${notification.read ? 'is-read bg-white border-neutral-100 hover:border-neutral-200' : 'is-unread native-stat-card border-neutral-200 shadow-sm'}`}
                >
                  <div className="flex items-start gap-3">
                    <span className={`notification-card-icon mt-0.5 h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${notification.read ? 'bg-neutral-50 text-neutral-400' : 'native-gradient-icon text-black'}`}>
                      <Bell size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex items-start justify-between gap-3">
                        <span className="notification-card-title font-bold text-black leading-snug">{notification.title || 'New update'}</span>
                        <span className="notification-card-time text-[9px] font-bold uppercase tracking-widest text-neutral-300 whitespace-nowrap">{formatNotificationTime(notification.createdAtMs || notification.createdAt)}</span>
                      </span>
                      <span className="notification-card-body block text-sm leading-relaxed text-neutral-500 mt-1">{notification.body || 'Open Build A Booking for the latest update.'}</span>
                      <span className="notification-card-link mt-3 inline-flex items-center gap-1 text-[9px] font-bold uppercase tracking-widest text-neutral-400 group-hover:text-black">
                        Open <ChevronRight size={13} />
                      </span>
                    </span>
                  </div>
                </button>
              )) : (
                <div className="py-14 px-6 text-center">
                  <div className="w-14 h-14 rounded-2xl bg-neutral-50 border border-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-300">
                    <Inbox size={22} />
                  </div>
                  <h3 className="text-xl font-bold tracking-tight text-black">Nothing waiting</h3>
                  <p className="text-sm text-neutral-500 mt-2">New bookings, messages, schedule updates, and reminders will land here.</p>
                </div>
              )}
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
