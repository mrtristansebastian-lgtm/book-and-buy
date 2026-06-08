import { useDashboardRouteConfig } from '../../dashboard';

export function useAppRouteHostConfig({
  actionRuntime,
  app,
  auth,
  clientPortal,
  data,
  dashboardUi,
  editor,
  publicBooking,
  route,
  settingsState,
  staff,
  workspace
}) {
  const usesPasswordProvider = Boolean(auth.user?.providerData?.some?.(provider => provider.providerId === 'password'));
  const requiresEmailVerification = Boolean(auth.user && usesPasswordProvider && !auth.user.emailVerified);

  const dashboard = useDashboardRouteConfig({
    account: {
      accountDeleteOpen: auth.accountDeleteOpen,
      accountDeleteText: auth.accountDeleteText,
      handleDeleteAccount: actionRuntime.auth.handleDeleteAccount,
      openBillingAction: actionRuntime.billing.openBillingAction,
      setAccountDeleteOpen: auth.setAccountDeleteOpen,
      setAccountDeleteText: auth.setAccountDeleteText
    },
    app: {
      appId: app.appId,
      copyToClipboard: actionRuntime.copyToClipboard,
      db: app.db,
      handleAddToHomeScreen: app.handleAddToHomeScreen,
      isFirebaseConfigured: app.isFirebaseConfigured
    },
    auth: {
      accessLoading: auth.accessLoading,
      authBusy: auth.authBusy,
      handleSignOut: actionRuntime.auth.handleSignOut,
      keepLoggedIn: auth.keepLoggedIn,
      openAuthPanel: actionRuntime.auth.openAuthPanel,
      openOwnerAuth: actionRuntime.auth.openOwnerAuth,
      setKeepLoggedIn: auth.setKeepLoggedIn,
      user: auth.user
    },
    booking: {
      actions: actionRuntime.booking,
      getBookingClientAvatar: data.getBookingClientAvatar,
      getBookingService: data.getBookingService,
      runtime: data.bookingRuntime,
      visibleBookings: data.visibleBookings
    },
    calendar: actionRuntime.calendar,
    clients: {
      actions: actionRuntime.clients,
      activeClient: data.activeClient,
      clientDeskFilter: data.clientDeskFilter,
      clientDeskFilters: data.clientDeskFilters,
      clientDirectory: data.clientDirectory,
      clientLabelOptions: data.clientLabelOptions,
      clientMobileView: data.clientMobileView,
      clientNoteDraft: data.clientNoteDraft,
      clientRecords: data.clientRecords,
      clientSearch: data.clientSearch,
      directory: data.clientDirectory,
      displayClients: data.displayClients,
      importedMigrationCounts: data.importedMigrationCounts,
      metrics: data.clientMetrics,
      setClientDeskFilter: data.setClientDeskFilter,
      setClientMobileView: data.setClientMobileView,
      setClientNoteDraft: data.setClientNoteDraft,
      setClientSearch: data.setClientSearch,
      setSelectedClientId: data.setSelectedClientId
    },
    editor: {
      bookingPageRoute: editor.bookingPageRoute,
      bookingPageUrl: editor.bookingPageUrl,
      colourCategoryId: dashboardUi.editorColourCategoryId,
      detectedBrandSignal: editor.detectedBrandSignal,
      launchPanel: dashboardUi.editorLaunchPanel,
      openBookingPage: editor.openBookingPage,
      runtime: editor.runtime,
      setColourCategoryId: dashboardUi.setEditorColourCategoryId,
      setLaunchPanel: dashboardUi.setEditorLaunchPanel
    },
    finance: {
      bookings: data.bookings,
      financeImports: data.financeImports
    },
    media: actionRuntime.media,
    overlays: {
      confirmDialog: dashboardUi.confirmDialog,
      legalPanel: dashboardUi.legalPanel,
      setConfirmDialog: dashboardUi.setConfirmDialog,
      setLegalPanel: dashboardUi.setLegalPanel,
      supportThreadFocus: dashboardUi.supportThreadFocus,
      toast: app.toast
    },
    profile: {
      activeProfileSection: dashboardUi.activeProfileSection,
      activeProfileSectionMeta: actionRuntime.profile.activeProfileSectionMeta,
      handleProfileActivityOpen: actionRuntime.profile.handleProfileActivityOpen,
      communications: actionRuntime.profile.communications,
      profileActivityPrimaryCount: actionRuntime.profile.profileActivityPrimaryCount,
      profileActivityRows: actionRuntime.profile.profileActivityRows,
      profileActivitySecondaryCount: actionRuntime.profile.profileActivitySecondaryCount,
      profileSections: actionRuntime.profile.profileSections,
      profileSystemFilter: dashboardUi.profileSystemFilter,
      profileSystemFilterOptions: actionRuntime.profile.profileSystemFilterOptions,
      setActiveProfileSection: dashboardUi.setActiveProfileSection,
      setCommunications: actionRuntime.profile.setCommunications,
      setProfileSystemFilter: dashboardUi.setProfileSystemFilter,
      setShowOwnerManual: dashboardUi.setShowOwnerManual,
      showOwnerManual: dashboardUi.showOwnerManual,
      saveCommunications: actionRuntime.profile.saveCommunications,
      venuePhotos: actionRuntime.profile.venuePhotos
    },
    route: {
      activeTab: route.activeTab,
      applyWorkspaceRoute: route.applyWorkspaceRoute,
      mobileNavOpen: dashboardUi.mobileNavOpen,
      navigateWorkspaceTab: route.navigateWorkspaceTab,
      setActiveTab: route.setActiveTab,
      setMobileNavOpen: dashboardUi.setMobileNavOpen,
      setSidebarCollapsed: dashboardUi.setSidebarCollapsed,
      sidebarCollapsed: dashboardUi.sidebarCollapsed
    },
    services: {
      setThemeFilters: dashboardUi.setThemeFilters,
      themeFilters: dashboardUi.themeFilters,
      workspaceServices: data.workspaceServices
    },
    settingsState: {
      ...actionRuntime.settings,
      markWorkspaceDirty: settingsState.markWorkspaceDirty,
      setSettings: settingsState.setSettings,
      settings: settingsState.settings,
      showToast: app.showToast
    },
    staff: {
      actions: actionRuntime.staff,
      activeStaffProfile: staff.activeStaffProfile,
      displayStaffList: staff.displayStaffList,
      safeStaffList: staff.safeStaffList,
      selectedStaffFileId: dashboardUi.selectedStaffFileId,
      setSelectedStaffFileId: dashboardUi.setSelectedStaffFileId,
      setTeamPanelMode: dashboardUi.setTeamPanelMode,
      staffList: staff.staffList,
      teamPanelMode: dashboardUi.teamPanelMode
    },
    workspace
  });

  return {
    appId: app.appId,
    db: app.db,
    route: {
      activeTab: route.activeTab,
      applyWorkspaceRoute: route.applyWorkspaceRoute,
      editorTab: route.editorTab,
      loading: app.loading,
      publicSlug: publicBooking.publicSlug,
      setView: route.setView,
      view: route.view
    },
    auth: {
      busy: auth.authBusy,
      error: auth.authError,
      form: auth.authForm,
      keepLoggedIn: auth.keepLoggedIn,
      mode: auth.authMode,
      onClientGuestPortal: actionRuntime.auth.openClientGuestPortal,
      onClientLogin: actionRuntime.auth.openClientPortal,
      onGoogleAuth: actionRuntime.auth.handleGoogleAuth,
      onGuestDashboard: actionRuntime.auth.openGuestDashboard,
      onPasswordReset: actionRuntime.auth.sendPasswordResetEmail,
      onRefreshVerification: actionRuntime.auth.refreshEmailVerification,
      onResendVerification: actionRuntime.auth.resendVerificationEmail,
      onSignOut: actionRuntime.auth.handleSignOut,
      onSignupOrDashboard: actionRuntime.auth.openSignupOrDashboard,
      onSubmit: actionRuntime.auth.handleAuthSubmit,
      openOwnerAuth: actionRuntime.auth.openOwnerAuth,
      openPanel: actionRuntime.auth.openAuthPanel,
      panelOpen: auth.authPanelOpen,
      persona: auth.authPersona,
      requiresEmailVerification,
      setError: auth.setAuthError,
      setForm: auth.setAuthForm,
      setKeepLoggedIn: auth.setKeepLoggedIn,
      setMode: auth.setAuthMode,
      setPanelOpen: auth.setAuthPanelOpen,
      setPersona: auth.setAuthPersona,
      user: auth.user
    },
    publicBooking: {
      error: publicBooking.publicError,
      loading: publicBooking.publicLoading,
      manualPaymentOptions: publicBooking.publicManualPaymentOptions,
      paymentOptions: publicBooking.publicPaymentOptions,
      onComplete: actionRuntime.booking.handlePublicBookingComplete,
      onInstallApp: app.handleAddToHomeScreen,
      onRetry: publicBooking.reloadPublicWorkspace,
      workspace: publicBooking.publicWorkspace
    },
    clientPortal: {
      isGuestPreview: clientPortal.clientGuestMode,
      setGuestPreview: clientPortal.setClientGuestMode,
      user: auth.user
    },
    landing: {
      legalPanel: dashboardUi.legalPanel,
      setLegalPanel: dashboardUi.setLegalPanel
    },
    dashboard
  };
}
