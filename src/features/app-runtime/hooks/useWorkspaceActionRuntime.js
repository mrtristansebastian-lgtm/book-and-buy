import { useBillingActions } from '../../account';
import { useAuthActions, useAuthBoot } from '../../auth';
import { useBookingActions } from '../../bookings';
import { useClientRecordActions } from '../../clients';
import { useGoogleCalendarActions } from '../../integrations';
import { useMediaCropUpload } from '../../media';
import { useProfilePageRuntime } from '../../profile';
import { useStaffActions } from '../../staff';
import { useWorkspaceSettingsActions } from '../../workspace';
import { normalizeCommunications } from '../../../config/appConfig';
import * as FirebaseSDK from '../../../services/firebase';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { useClipboard } from './useClipboard';

export function useWorkspaceActionRuntime({
  account,
  app,
  auth,
  booking,
  clients,
  editor,
  profile,
  publicBooking,
  route,
  settingsState,
  staff,
  workspace
}) {
  const { showToast } = app;
  const { settings, settingsRef } = settingsState;

  const staffActions = useStaffActions({
    canManageTeam: workspace.canManageTeam,
    personalDisplayName: workspace.personalDisplayName,
    personalProfile: workspace.personalProfile,
    safeStaffList: staff.safeStaffList,
    setStaffList: staff.setStaffList,
    settings,
    showToast,
    staffList: staff.staffList,
    user: auth.user,
    workspaceOwnerId: workspace.workspaceOwnerId
  });

  const settingsActions = useWorkspaceSettingsActions({
    accountProfileKey: workspace.accountProfileKey,
    activeStaffId: staff.activeStaffProfile?.id || 'owner',
    canManageTeam: workspace.canManageTeam,
    canManageWorkspace: workspace.canManageWorkspace,
    clearWorkspaceDirty: settingsState.clearWorkspaceDirty,
    displayStaffList: staff.displayStaffList,
    isWorkspaceOwner: workspace.isWorkspaceOwner,
    markWorkspaceDirty: settingsState.markWorkspaceDirty,
    personalDisplayName: workspace.personalDisplayName,
    personalProfile: workspace.personalProfile,
    publishedSettingsSnapshotRef: settingsState.publishedSettingsSnapshotRef,
    resetEditorPreviewScroll: editor.resetPreviewScroll,
    saveStaff: staffActions.saveStaff,
    setAccountProfileOverride: workspace.setAccountProfileOverride,
    setSettings: settingsState.setSettings,
    setStaffList: staff.setStaffList,
    settings,
    settingsRef,
    showToast,
    staffList: staff.staffList,
    user: auth.user,
    workspaceRole: workspace.workspaceRole,
    workspaceOwnerId: workspace.workspaceOwnerId
  });

  const { copyToClipboard } = useClipboard({ showToast });

  const media = useMediaCropUpload({
    handleSettingChange: settingsActions.handleSettingChange,
    persistProfileChanges: settingsActions.persistProfileChanges,
    personalProfile: workspace.personalProfile,
    saveWorkspaceSettingsPatch: settingsActions.saveWorkspaceSettingsPatch,
    settings,
    settingsRef,
    showToast,
    updatePersonalProfile: settingsActions.updatePersonalProfile,
    user: auth.user,
    workspaceOwnerId: workspace.workspaceOwnerId
  });

  const authActions = useAuthActions({
    accountDeleteText: account.accountDeleteText,
    activeTab: route.activeTab,
    applyWorkspaceRoute: route.applyWorkspaceRoute,
    authForm: auth.authForm,
    authMode: auth.authMode,
    authPersona: auth.authPersona,
    clearWorkspaceDirty: settingsState.clearWorkspaceDirty,
    confirmLeavingUnsavedChanges: settingsState.confirmLeavingUnsavedChanges,
    deleteStorageAsset: media.deleteStorageAsset,
    editorTab: route.editorTab,
    getAuthReturnRouteForPersona: route.getAuthReturnRouteForPersona,
    isGuestWorkspace: workspace.isGuestWorkspace,
    isNativeAppRuntime: app.isNativeAppRuntime,
    keepLoggedIn: auth.keepLoggedIn,
    personalProfile: workspace.personalProfile,
    resetWorkspaceRuntimeState: workspace.resetWorkspaceRuntimeState,
    setAccountDeleteOpen: account.setAccountDeleteOpen,
    setAccountDeleteText: account.setAccountDeleteText,
    setActiveWorkspaceOwnerId: workspace.setActiveWorkspaceOwnerId,
    setAuthBusy: auth.setAuthBusy,
    setAuthError: auth.setAuthError,
    setAuthMode: auth.setAuthMode,
    setAuthPanelOpen: auth.setAuthPanelOpen,
    setAuthPersona: auth.setAuthPersona,
    setAuthRedirectPending: auth.setAuthRedirectPending,
    setAuthRefreshTick: auth.setAuthRefreshTick,
    setClientGuestMode: auth.setClientGuestMode,
    setGuestMode: auth.setGuestMode,
    setView: route.setView,
    setWorkspaceAccess: auth.setWorkspaceAccess,
    showToast,
    user: auth.user,
    view: route.view
  });

  const billing = useBillingActions({
    isGuestWorkspace: workspace.isGuestWorkspace,
    openAuthPanel: authActions.openAuthPanel,
    showToast,
    user: auth.user,
    workspaceOwnerId: workspace.workspaceOwnerId
  });

  const calendar = useGoogleCalendarActions({
    applyAuthPersistence: authActions.applyAuthPersistence,
    canManageWorkspace: workspace.canManageWorkspace,
    displayStaffList: staff.displayStaffList,
    getCurrentAuthReturnRoute: route.getCurrentAuthReturnRoute,
    isNativeAppRuntime: app.isNativeAppRuntime,
    keepLoggedIn: auth.keepLoggedIn,
    saveWorkspaceSettingsPatch: settingsActions.saveWorkspaceSettingsPatch,
    setAuthMode: auth.setAuthMode,
    setAuthPanelOpen: auth.setAuthPanelOpen,
    setAuthPersona: auth.setAuthPersona,
    setBookingsAndCache: booking.setBookingsAndCache,
    settings,
    showToast,
    startGoogleRedirect: authActions.startGoogleRedirect,
    user: auth.user,
    visibleBookings: booking.visibleBookings,
    workspaceOwnerId: workspace.workspaceOwnerId
  });

  useAuthBoot({
    applyAuthPersistence: authActions.applyAuthPersistence,
    applyWorkspaceRoute: route.applyWorkspaceRoute,
    authRedirectPending: auth.authRedirectPending,
    guestMode: auth.guestMode,
    keepLoggedIn: auth.keepLoggedIn,
    loading: app.loading,
    publicSlug: publicBooking.publicSlug,
    resetGuestWorkspaceSeed: workspace.resetGuestWorkspaceSeed,
    resetWorkspaceRuntimeState: workspace.resetWorkspaceRuntimeState,
    setAccessLoading: auth.setAccessLoading,
    setAccountProfileOverride: workspace.setAccountProfileOverride,
    setActiveWorkspaceOwnerId: workspace.setActiveWorkspaceOwnerId,
    setAuthBusy: auth.setAuthBusy,
    setAuthError: auth.setAuthError,
    setAuthPanelOpen: auth.setAuthPanelOpen,
    setAuthRedirectPending: auth.setAuthRedirectPending,
    setClientGuestMode: auth.setClientGuestMode,
    setGoogleCalendarAuth: calendar.setGoogleCalendarAuth,
    setGuestMode: auth.setGuestMode,
    setLoading: app.setLoading,
    setPublicError: publicBooking.setPublicError,
    setPublicLoading: publicBooking.setPublicLoading,
    setUser: auth.setUser,
    setView: route.setView,
    setWorkspaceAccess: auth.setWorkspaceAccess,
    showToast,
    user: auth.user,
    view: route.view
  });

  const clientActions = useClientRecordActions({
    bookingPageSlug: publicBooking.bookingPageSlug,
    buildClientKey: clients.buildClientKey,
    canManageWorkspace: workspace.canManageWorkspace,
    clientDirectory: clients.clientDirectory,
    clientRecords: clients.clientRecords,
    deleteStorageAsset: media.deleteStorageAsset,
    requestImageCropUpload: media.requestImageCropUpload,
    safeClientRecords: clients.safeClientRecords,
    safeFinanceImports: clients.safeFinanceImports,
    setBookingsAndCache: booking.setBookingsAndCache,
    setClientMobileView: clients.setClientMobileView,
    setClientRecords: clients.setClientRecords,
    setFinanceImports: clients.setFinanceImports,
    setSelectedClientId: clients.setSelectedClientId,
    settings,
    showToast,
    user: auth.user,
    visibleBookings: booking.visibleBookings,
    workspaceOwnerId: workspace.workspaceOwnerId
  });

  const bookingActions = useBookingActions({
    communications: booking.communications,
    confirmLeavingUnsavedChanges: settingsState.confirmLeavingUnsavedChanges,
    createClientNotification: booking.createClientNotification,
    createOwnerNotification: booking.createOwnerNotification,
    getBookingClientAvatar: clients.getBookingClientAvatar,
    isGuestWorkspace: workspace.isGuestWorkspace,
    navigateWorkspaceTab: route.navigateWorkspaceTab,
    publicSlug: publicBooking.publicSlug,
    publicWorkspace: publicBooking.publicWorkspace,
    safeStaffList: staff.safeStaffList,
    setActiveTab: route.setActiveTab,
    setBookingFilter: booking.runtime.setBookingFilter,
    setBookingsAndCache: booking.setBookingsAndCache,
    setManualBookingOpen: booking.runtime.setManualBookingOpen,
    setManualBookingServiceId: booking.runtime.setManualBookingServiceId,
    setSupportThreadFocus: profile.setSupportThreadFocus,
    settings,
    showToast,
    user: auth.user,
    visibleBookings: booking.visibleBookings,
    workspaceOwnerId: workspace.workspaceOwnerId,
    workspaceServices: booking.workspaceServices
  });

  const saveCommunications = async (nextCommunications = booking.communications) => {
    const normalized = normalizeCommunications(nextCommunications);
    if (!workspace.isGuestWorkspace && !workspace.canManageWorkspace) {
      showToast('Only admins can change notification settings.');
      return false;
    }
    booking.setCommunications?.(normalized);
    if (!isFirebaseConfigured || !auth.user || workspace.isGuestWorkspace) {
      showToast('Notification settings saved in demo mode.');
      return true;
    }
    try {
      await FirebaseSDK.setDoc(
        FirebaseSDK.doc(db, 'artifacts', appId, 'users', workspace.workspaceOwnerId, 'config', 'communications'),
        normalized,
        { merge: true }
      );
      showToast('Notification settings saved.');
      return true;
    } catch (error) {
      console.error(error);
      showToast('Notification settings could not be saved.');
      return false;
    }
  };

  const profileRuntime = useProfilePageRuntime({
    activeProfileSection: profile.activeProfileSection,
    displayStaffList: staff.displayStaffList,
    financePaymentAttempts: profile.financePaymentAttempts,
    importedMigrationCounts: clients.importedMigrationCounts,
    isGuestWorkspace: workspace.isGuestWorkspace,
    markWorkspaceNotificationRead: profile.markWorkspaceNotificationRead,
    navigateWorkspaceTab: route.navigateWorkspaceTab,
    openOwnerNotification: profile.openOwnerNotification,
    openWorkspaceSupportThread: bookingActions.openWorkspaceSupportThread,
    profileNotificationFilter: profile.profileNotificationFilter,
    profileSystemFilter: profile.profileSystemFilter,
    safeFinanceImports: clients.safeFinanceImports,
    setActiveProfileSection: profile.setActiveProfileSection,
    setBookingDeskPeriod: booking.runtime.setBookingDeskPeriod,
    setBookingFilter: booking.runtime.setBookingFilter,
    setBookingSearch: booking.runtime.setBookingSearch,
    setShowOwnerManual: profile.setShowOwnerManual,
    settings,
    userEmail: auth.user?.email,
    workspaceNotifications: profile.workspaceNotifications,
    workspaceRole: workspace.workspaceRole,
    workspaceServices: booking.workspaceServices,
    workspaceSupportThreads: profile.workspaceSupportThreads
  });

  return {
    auth: authActions,
    billing,
    booking: bookingActions,
    calendar,
    clients: clientActions,
    copyToClipboard,
    media,
    profile: {
      ...profileRuntime,
      communications: profile.communications,
      saveCommunications,
      setCommunications: profile.setCommunications
    },
    settings: settingsActions,
    staff: staffActions
  };
}
