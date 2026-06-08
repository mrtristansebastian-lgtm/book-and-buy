import { useMemo } from 'react';

const dateValueToMs = (value) => {
  if (!value) return 0;
  if (typeof value === 'number') return value;
  if (value?.toMillis) return value.toMillis();
  if (value?.seconds) return value.seconds * 1000;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? 0 : parsed;
};

const classifyWorkspaceNotification = (notification = {}) => {
  const text = `${notification.type || ''} ${notification.title || ''} ${notification.body || ''}`.toLowerCase();
  if (text.includes('reschedule') || text.includes('move') || text.includes('change time')) return 'reschedules';
  if (text.includes('message') || text.includes('chat') || text.includes('reply')) return 'messages';
  if (text.includes('payment') || text.includes('paid') || text.includes('invoice')) return 'payments';
  if (text.includes('waitlist')) return 'waitlist';
  if (text.includes('request') || text.includes('booking')) return 'requests';
  return 'alerts';
};

const sortProfileLatest = (items, getTime = item => item?.time) => (
  [...(items || [])].sort((a, b) => {
    const aTime = Number(getTime(a) || 0);
    const bTime = Number(getTime(b) || 0);
    return bTime - aTime;
  })
);

export function useProfileActivity({
  displayStaffList,
  financeImports,
  financePaymentAttempts,
  importedMigrationCounts,
  notificationFilter,
  notifications,
  services,
  settings,
  supportThreads,
  systemFilter
}) {
  const notificationItems = useMemo(() => sortProfileLatest([
    ...(notifications || []).map(notification => {
      const category = classifyWorkspaceNotification(notification);
      return {
        id: `notification-${notification.id}`,
        kind: 'notification',
        category,
        iconKind: category === 'payments' ? 'payment' : category === 'messages' ? 'chat' : category === 'reschedules' ? 'reschedule' : category === 'requests' || category === 'waitlist' ? 'booking' : 'notification',
        title: notification.title || 'Workspace update',
        detail: notification.body || 'Open Build A Booking for the latest update.',
        time: dateValueToMs(notification.createdAtMs || notification.createdAt || notification.updatedAt),
        label: notification.read ? 'Read' : 'Unread',
        isUnread: !notification.read,
        source: notification
      };
    }),
    ...(supportThreads || []).map(thread => {
      const status = String(thread.bookingStatus || thread.status || '').toLowerCase();
      const rescheduleStatus = String(thread.rescheduleStatus || '').toLowerCase();
      const threadText = [thread.lastMessage, thread.serviceName, thread.clientName].filter(Boolean).join(' ').toLowerCase();
      const isReschedule = ['requested', 'countered'].includes(rescheduleStatus) || threadText.includes('reschedule') || threadText.includes('change time') || threadText.includes('move');
      const isWaitlist = status === 'waitlist' || threadText.includes('waitlist') || threadText.includes('spot opens');
      const category = isReschedule ? 'reschedules' : isWaitlist ? 'waitlist' : 'messages';
      return {
        id: `chat-${thread.id}`,
        kind: 'chat',
        category,
        iconKind: isReschedule ? 'reschedule' : 'chat',
        title: thread.clientName || 'Client chat',
        detail: thread.lastMessage || `${thread.serviceName || 'Booking'} thread is open.`,
        time: dateValueToMs(thread.lastMessageAt || thread.updatedAt || thread.createdAt),
        label: Number(thread.ownerUnread || 0) > 0 ? `${thread.ownerUnread} unread` : category === 'waitlist' ? 'Waitlist' : 'Chat',
        isUnread: Number(thread.ownerUnread || 0) > 0,
        source: thread
      };
    })
  ], item => item.time).slice(0, 48), [notifications, supportThreads]);

  const notificationFilterOptions = useMemo(() => ([
    { id: 'all', label: 'All' },
    { id: 'requests', label: 'Requests' },
    { id: 'messages', label: 'Messages' },
    { id: 'reschedules', label: 'Reschedules' },
    { id: 'waitlist', label: 'Waitlist' },
    { id: 'payments', label: 'Payments' }
  ].map(option => ({
    ...option,
    count: option.id === 'all'
      ? notificationItems.length
      : notificationItems.filter(item => item.category === option.id).length
  }))), [notificationItems]);

  const filteredNotifications = useMemo(() => notificationItems.filter(item => (
    notificationFilter === 'all' || item.category === notificationFilter
  )), [notificationFilter, notificationItems]);

  const systemActivityItems = useMemo(() => sortProfileLatest([
    {
      id: 'system-services',
      kind: 'system',
      category: 'services',
      iconKind: 'services',
      title: 'Service menu ready',
      detail: `${services.length} services with duration, price, and booking-page display settings.`,
      time: dateValueToMs(settings.servicesUpdatedAt || settings.updatedAt) || Date.now() - 6 * 60 * 1000,
      label: 'Services'
    },
    {
      id: 'system-team',
      kind: 'system',
      category: 'team',
      iconKind: 'team',
      title: 'Team calendars connected',
      detail: `${displayStaffList.length} staff profiles available for bookings and schedule visibility.`,
      time: dateValueToMs(settings.staffUpdatedAt || settings.updatedAt) || Date.now() - 16 * 60 * 1000,
      label: 'Team'
    },
    {
      id: 'system-schedule',
      kind: 'system',
      category: 'schedule',
      iconKind: 'schedule',
      title: 'Schedule capacity synced',
      detail: `${Object.keys(settings.schedule || {}).length} custom schedule days and ${(settings.availableTimes || []).length} default times configured.`,
      time: dateValueToMs(settings.scheduleUpdatedAt || settings.updatedAt) || Date.now() - 29 * 60 * 1000,
      label: 'Schedule'
    },
    {
      id: 'system-editor',
      kind: 'system',
      category: 'editor',
      iconKind: 'editor',
      title: 'Booking page configured',
      detail: `${settings.brandName || 'Your booking page'} is using ${settings.serviceDisplayMode === 'dropdown' ? 'dropdown flow' : 'display flow'} with live theme settings.`,
      time: dateValueToMs(settings.editorUpdatedAt || settings.updatedAt) || Date.now() - 44 * 60 * 1000,
      label: 'Editor'
    },
    {
      id: 'system-finance',
      kind: 'system',
      category: 'finance',
      iconKind: 'payment',
      title: 'Finance desk aligned',
      detail: `${financeImports.length + financePaymentAttempts.length} finance records and payment attempts available for review.`,
      time: dateValueToMs(settings.financeUpdatedAt || settings.updatedAt) || Date.now() - 61 * 60 * 1000,
      label: 'Finance'
    },
    {
      id: 'system-migration',
      kind: 'system',
      category: 'migration',
      iconKind: 'migration',
      title: 'Migration Studio available',
      detail: `${importedMigrationCounts.clients + importedMigrationCounts.bookings + importedMigrationCounts.financeRecords} imported records can be reviewed or cleared.`,
      time: Date.now() - 83 * 60 * 1000,
      label: 'Migration'
    }
  ], item => item.time), [
    displayStaffList.length,
    financeImports.length,
    financePaymentAttempts.length,
    importedMigrationCounts.bookings,
    importedMigrationCounts.clients,
    importedMigrationCounts.financeRecords,
    services.length,
    settings
  ]);

  const systemFilterOptions = useMemo(() => ([
    { id: 'all', label: 'All' },
    { id: 'services', label: 'Services' },
    { id: 'team', label: 'Team' },
    { id: 'schedule', label: 'Schedule' },
    { id: 'editor', label: 'Editor' },
    { id: 'finance', label: 'Finance' }
  ].map(option => ({
    ...option,
    count: option.id === 'all'
      ? systemActivityItems.length
      : systemActivityItems.filter(item => item.category === option.id).length
  }))), [systemActivityItems]);

  const activityRows = useMemo(() => systemActivityItems.filter(item => (
    systemFilter === 'all' || item.category === systemFilter
  )), [systemActivityItems, systemFilter]);

  return {
    activityRows,
    filteredNotifications,
    notificationFilterOptions,
    notificationItems,
    primaryCount: systemActivityItems.length,
    secondaryCount: systemFilterOptions.filter(option => option.id !== 'all' && option.count > 0).length,
    systemActivityItems,
    systemFilterOptions
  };
}
