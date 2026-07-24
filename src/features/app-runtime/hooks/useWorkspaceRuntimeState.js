import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { useAuthSession } from '../../auth';
import { useBookingPageRuntime } from '../../bookings';
import { useClientDirectory } from '../../clients';
import { useDashboardUiState } from '../../dashboard';
import { useDetectedBrandSignal, useEditorRuntime } from '../../editor';
import { useWorkspaceNotifications } from '../../notifications';
import { useBookingPageLauncher } from '../../public-booking/hooks/useBookingPageLauncher';
import {
  useWorkspaceData,
  useWorkspaceDataSync,
  useWorkspaceDerivedData,
  useWorkspaceDirtyState,
  useWorkspaceIdentity,
  useWorkspaceRoute,
  createWorkspacePageLoaders
} from '../../workspace';
import { appId, db, isFirebaseConfigured } from '../../../services/firebase';
import { safeLocalRemove, safeLocalSet } from '../../../utils/workspaceRoute';
import { exampleModeStorageKey, guestPublicPreviewStorageKey } from '../../../utils/publicBookingRoute';
import { useAppRuntimeEffects } from './useAppRuntimeEffects';
import { useClientErrorReporting } from './useClientErrorReporting';
import { useDesignerFontLoader } from './useDesignerFontLoader';
import { useInstallPrompt } from './useInstallPrompt';
import { useToastMessage } from './useToastMessage';

const noop = () => {};

export function useWorkspaceRuntimeState() {
  const isNativeAppRuntime = Capacitor?.isNativePlatform?.() || false;
  const [loading, setLoading] = useState(true);
  const authSession = useAuthSession();
  const dirtyState = useWorkspaceDirtyState();
  const route = useWorkspaceRoute({ confirmLeavingUnsavedChanges: dirtyState.confirmLeavingUnsavedChanges, loading });
  const [guestMode, setGuestMode] = useState(() => route.startsInGuestWorkspace);
  const [exampleMode, setExampleMode] = useState(() => route.startsInGuestWorkspace && typeof window !== 'undefined' && window.localStorage?.getItem(exampleModeStorageKey) === 'true');
  const [clientGuestMode, setClientGuestMode] = useState(false);
  const dashboardUi = useDashboardUiState({ activeTab: route.activeTab });
  const editorRuntime = useEditorRuntime({
    activeTab: route.activeTab,
    setEditorTab: route.setEditorTab,
    sidebarCollapsed: dashboardUi.sidebarCollapsed
  });
  const settingsRef = useRef(null);
  const publishedSettingsSnapshotRef = useRef(null);
  const { showToast, toast } = useToastMessage();

  useEffect(() => {
    safeLocalRemove('build-a-booking-dashboard-theme');
  }, []);

  useAppRuntimeEffects({ isNativeAppRuntime });

  const workspaceOwnerId = authSession.activeWorkspaceOwnerId || authSession.user?.uid || '';
  const workspacePageLoaders = useMemo(() => (
    createWorkspacePageLoaders({ ownerId: workspaceOwnerId })
  ), [workspaceOwnerId]);
  const isDashboardGuestPreview = route.view === 'dashboard' && !authSession.authRedirectPending;
  const isGuestWorkspace = Boolean((guestMode || isDashboardGuestPreview) && !authSession.user && !route.publicSlug && !authSession.authRedirectPending);
  const workspaceData = useWorkspaceData({
    isGuestWorkspace,
    isExampleMode: exampleMode,
    loading,
    publishedSettingsSnapshotRef,
    settingsRef,
    startsInGuestWorkspace: route.startsInGuestWorkspace,
    workspaceOwnerId
  });
  const {
    exampleManifest,
    loadFitnessStudioExample,
    restoreBlankGuestWorkspace
  } = workspaceData;
  const workspaceIdentity = useWorkspaceIdentity({
    accountProfileOverride: workspaceData.accountProfileOverride,
    isExampleMode: exampleMode,
    isGuestWorkspace,
    safeStaffList: workspaceData.safeStaffList,
    settings: workspaceData.settings,
    user: authSession.user,
    workspaceAccess: authSession.workspaceAccess,
    workspaceOwnerId
  });
  const clientDirectory = useClientDirectory({
    safeClientRecords: workspaceData.safeClientRecords,
    visibleBookings: workspaceData.visibleBookings
  });
  const notifications = useWorkspaceNotifications({
    clientDirectory: clientDirectory.clientDirectory,
    isGuestWorkspace,
    exampleMode,
    exampleNotifications: workspaceData.exampleNotifications,
    exampleSupportThreads: workspaceData.exampleSupportThreads,
    navigateWorkspaceTab: route.navigateWorkspaceTab,
    publicSlug: route.publicSlug,
    setEditorTab: route.setEditorTab,
    showToast,
    user: authSession.user,
    workspaceOwnerId
  });
  const detectedBrandSignal = useDetectedBrandSignal(workspaceData.settings.logo);
  const bookingPage = useBookingPageLauncher(workspaceData.settings);

  const enableExampleMode = useCallback(() => {
    if (!isGuestWorkspace || authSession.user) return;
    const example = loadFitnessStudioExample(new Date());
    const publicSettings = { ...example.settings };
    delete publicSettings.accountProfiles;
    delete publicSettings.googleCalendar;
    const publicStaff = example.staffList.map(({ id, name, role, title, color, avatar, photoURL }) => ({
      id, name, role, title, color, avatar, photoURL
    }));
    safeLocalSet(exampleModeStorageKey, 'true');
    safeLocalSet(guestPublicPreviewStorageKey, JSON.stringify({ version: 1, slug: example.settings.slug, settings: publicSettings, staff: publicStaff }));
    startTransition(() => setExampleMode(true));
    showToast('Kinetic House example studio is on. Changes are read-only.');
  }, [authSession.user, isGuestWorkspace, loadFitnessStudioExample, showToast]);

  const disableExampleMode = useCallback(() => {
    restoreBlankGuestWorkspace();
    safeLocalRemove(exampleModeStorageKey);
    safeLocalRemove(guestPublicPreviewStorageKey);
    startTransition(() => setExampleMode(false));
    showToast('Returned to your blank guest workspace.');
  }, [restoreBlankGuestWorkspace, showToast]);

  useEffect(() => {
    if (!isGuestWorkspace || !exampleMode || loading || exampleManifest) return;
    loadFitnessStudioExample(new Date());
  }, [exampleManifest, exampleMode, isGuestWorkspace, loadFitnessStudioExample, loading]);

  useEffect(() => {
    if (!authSession.user) return;
    if (!exampleMode) return;
    safeLocalRemove(exampleModeStorageKey);
    safeLocalRemove(guestPublicPreviewStorageKey);
    startTransition(() => setExampleMode(false));
  }, [authSession.user?.uid, exampleMode]);

  const resetWorkspaceRuntimeState = () => {
    workspaceData.resetWorkspaceData();
    notifications.resetWorkspaceNotifications();
    dashboardUi.setSupportThreadFocus(null);
    clientDirectory.setSelectedClientId(null);
    clientDirectory.setClientMobileView('directory');
    dashboardUi.setSelectedStaffFileId(null);
  };

  useEffect(() => {
    if (route.publicSlug || loading || authSession.user || isGuestWorkspace) return;
    resetWorkspaceRuntimeState();
  }, [route.publicSlug, loading, authSession.user?.uid, guestMode, isGuestWorkspace]);

  useClientErrorReporting({ appId, db, isFirebaseConfigured, user: authSession.user, workspaceOwnerId });

  const workspaceDerivedData = useWorkspaceDerivedData({
    safeClientRecords: workspaceData.safeClientRecords,
    safeFinanceImports: workspaceData.safeFinanceImports,
    settings: workspaceData.settings,
    visibleBookings: workspaceData.visibleBookings
  });

  useWorkspaceDataSync({
    isGuestWorkspace,
    isWorkspaceOwner: workspaceIdentity.isWorkspaceOwner,
    loading,
    personalDisplayName: workspaceIdentity.personalDisplayName,
    personalProfile: workspaceIdentity.personalProfile,
    publicSlug: route.publicSlug,
    publishedSettingsSnapshotRef,
    setBookings: workspaceData.setBookings,
    setBookingsReady: workspaceData.setBookingsReady,
    setClientRecords: workspaceData.setClientRecords,
    setCommunications: workspaceData.setCommunications,
    setFinanceImports: workspaceData.setFinanceImports,
    setFinancePaymentAttempts: workspaceData.setFinancePaymentAttempts,
    setSettings: workspaceData.setSettings,
    setStaffList: workspaceData.setStaffList,
    settingsRef,
    user: authSession.user,
    workspaceOwnerId
  });

  const bookingRuntime = useBookingPageRuntime({
    safeStaffList: workspaceData.safeStaffList,
    visibleBookings: workspaceData.visibleBookings,
    workspaceServices: workspaceDerivedData.workspaceServices
  });
  const { handleAddToHomeScreen } = useInstallPrompt({ showToast });
  useDesignerFontLoader({
    activeTab: route.activeTab,
    editorTab: route.editorTab,
    isMobileEditorRuntime: editorRuntime.isMobileEditorRuntime,
    publicSlug: route.publicSlug
  });

  return {
    account: {
      accountDeleteText: authSession.accountDeleteText,
      setAccountDeleteOpen: authSession.setAccountDeleteOpen,
      setAccountDeleteText: authSession.setAccountDeleteText
    },
    app: {
      appId,
      db,
      handleAddToHomeScreen,
      isFirebaseConfigured,
      isNativeAppRuntime,
      loading,
      setLoading,
      showToast,
      toast
    },
    auth: {
      ...authSession,
      guestMode,
      setClientGuestMode,
      setGuestMode
    },
    booking: {
      communications: workspaceData.communications,
      createClientNotification: notifications.createClientNotification,
      createOwnerNotification: notifications.createOwnerNotification,
      runtime: bookingRuntime,
      setBookingsAndCache: workspaceData.setBookingsAndCache,
      setCommunications: workspaceData.setCommunications,
      visibleBookings: workspaceData.visibleBookings,
      workspaceServices: workspaceDerivedData.workspaceServices
    },
    clientPortal: { clientGuestMode, setClientGuestMode },
    clients: {
      ...clientDirectory,
      clientRecords: workspaceData.clientRecords,
      importedMigrationCounts: workspaceDerivedData.importedMigrationCounts,
      safeClientRecords: workspaceData.safeClientRecords,
      safeFinanceImports: workspaceData.safeFinanceImports,
      setClientRecords: workspaceData.setClientRecords,
      setFinanceImports: workspaceData.setFinanceImports
    },
    dashboardUi,
    data: {
      ...clientDirectory,
      bookingRuntime,
      bookings: workspaceData.bookings,
      clientRecords: workspaceData.clientRecords,
      financeImports: workspaceData.financeImports,
      getBookingService: workspaceDerivedData.getBookingService,
      importedMigrationCounts: workspaceDerivedData.importedMigrationCounts,
      pageLoaders: workspacePageLoaders,
      visibleBookings: workspaceData.visibleBookings,
      workspaceServices: workspaceDerivedData.workspaceServices
    },
    editor: {
      bookingPageRoute: bookingPage.bookingPageRoute,
      bookingPageSlug: bookingPage.bookingPageSlug,
      bookingPageUrl: bookingPage.bookingPageUrl,
      detectedBrandSignal,
      openBookingPage: bookingPage.openBookingPage,
      resetPreviewScroll: editorRuntime.resetPreviewScroll,
      runtime: editorRuntime
    },
    profile: {
      activeProfileSection: dashboardUi.activeProfileSection,
      communications: workspaceData.communications,
      financePaymentAttempts: workspaceData.financePaymentAttempts,
      markWorkspaceNotificationRead: notifications.markWorkspaceNotificationRead,
      openOwnerNotification: notifications.openOwnerNotification,
      profileNotificationFilter: dashboardUi.profileNotificationFilter,
      profileSystemFilter: dashboardUi.profileSystemFilter,
      setActiveProfileSection: dashboardUi.setActiveProfileSection,
      setCommunications: workspaceData.setCommunications,
      setShowBusinessOnboarding: dashboardUi.setShowBusinessOnboarding,
      setSupportThreadFocus: dashboardUi.setSupportThreadFocus,
      workspaceNotifications: notifications.workspaceNotifications,
      workspaceSupportThreads: notifications.workspaceSupportThreads
    },
    publicBooking: {
      publicError: '',
      publicLoading: false,
      publicManualPaymentOptions: [],
      publicPaymentOptions: [],
      publicWorkspace: null,
      reloadPublicWorkspace: noop,
      setPublicError: noop,
      setPublicLoading: noop,
      bookingPageSlug: bookingPage.bookingPageSlug,
      publicSlug: route.publicSlug
    },
    route,
    settingsState: {
      ...dirtyState,
      publishedSettingsSnapshotRef,
      setSettings: workspaceData.setSettings,
      settings: workspaceData.settings,
      settingsRef
    },
    staff: {
      activeStaffProfile: workspaceIdentity.activeStaffProfile,
      displayStaffList: workspaceIdentity.displayStaffList,
      safeStaffList: workspaceData.safeStaffList,
      setStaffList: workspaceData.setStaffList,
      staffList: workspaceData.staffList
    },
    workspace: {
      ...workspaceIdentity,
      exampleMode,
      exampleGatewayStates: workspaceData.exampleGatewayStates,
      exampleManifest: workspaceData.exampleManifest,
      exampleSupportThreads: workspaceData.exampleSupportThreads,
      enableExampleMode,
      disableExampleMode,
      isGuestWorkspace,
      resetGuestWorkspaceSeed: workspaceData.resetGuestWorkspaceSeed,
      resetWorkspaceRuntimeState,
      setAccountProfileOverride: workspaceData.setAccountProfileOverride,
      setActiveWorkspaceOwnerId: authSession.setActiveWorkspaceOwnerId,
      workspaceOwnerId
    }
  };
}
