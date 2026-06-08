import { buildProfileSections } from '../config/profileSections';
import { useProfileActivity } from './useProfileActivity';

export function useProfilePageRuntime({
  activeProfileSection,
  displayStaffList,
  financePaymentAttempts,
  importedMigrationCounts,
  isGuestWorkspace,
  markWorkspaceNotificationRead,
  navigateWorkspaceTab,
  openOwnerNotification,
  openWorkspaceSupportThread,
  profileNotificationFilter,
  profileSystemFilter,
  safeFinanceImports,
  setActiveProfileSection,
  setBookingDeskPeriod,
  setBookingFilter,
  setBookingSearch,
  setShowOwnerManual,
  settings,
  userEmail,
  workspaceNotifications,
  workspaceRole,
  workspaceServices,
  workspaceSupportThreads
}) {
  const profileActivity = useProfileActivity({
    displayStaffList,
    financeImports: safeFinanceImports,
    financePaymentAttempts,
    importedMigrationCounts,
    notificationFilter: profileNotificationFilter,
    notifications: workspaceNotifications,
    services: workspaceServices,
    settings,
    supportThreads: workspaceSupportThreads,
    systemFilter: profileSystemFilter
  });

  const handleProfileActivityOpen = (item) => {
    if (!item) return;
    if (item.kind === 'notification') {
      if (item.source?.id && !item.source.read) markWorkspaceNotificationRead(item.source.id);
      openOwnerNotification(item.source);
      return;
    }
    if (item.kind === 'chat') {
      openWorkspaceSupportThread(item.source);
      return;
    }
    if (item.kind === 'payment') {
      navigateWorkspaceTab('finance');
      return;
    }
    if (item.kind === 'system') {
      if (item.category === 'services') navigateWorkspaceTab('services');
      if (item.category === 'team') navigateWorkspaceTab('staff');
      if (item.category === 'schedule') navigateWorkspaceTab('business');
      if (item.category === 'editor') navigateWorkspaceTab('editor');
      if (item.category === 'finance') navigateWorkspaceTab('finance');
      if (item.category === 'migration') setActiveProfileSection('migration');
      return;
    }
    if (item.kind === 'booking') {
      setBookingDeskPeriod('all');
      setBookingFilter('all');
      setBookingSearch(item.source?.clientName || '');
      navigateWorkspaceTab('bookings');
    }
  };

  const profileSections = buildProfileSections({
    importedMigrationCounts,
    isGuestWorkspace,
    onManualOpen: () => setShowOwnerManual(true),
    profileActivityPrimaryCount: profileActivity.primaryCount,
    settings,
    userEmail,
    workspaceRole
  });

  return {
    activeProfileSectionMeta: profileSections.find(section => section.id === activeProfileSection),
    handleProfileActivityOpen,
    profileActivityPrimaryCount: profileActivity.primaryCount,
    profileActivityRows: profileActivity.activityRows,
    profileActivitySecondaryCount: profileActivity.secondaryCount,
    profileSections,
    profileSystemFilterOptions: profileActivity.systemFilterOptions,
    venuePhotos: Array.isArray(settings.venuePhotos) ? settings.venuePhotos.filter(Boolean) : []
  };
}
