import { startTransition } from 'react';
import { buildProfileRoute } from './buildProfileRoute';
import { useDashboardNavigationModel } from './useDashboardNavigationModel';

export function useDashboardRouteConfig({
  account,
  app,
  auth,
  booking,
  calendar,
  clients,
  editor,
  finance,
  media,
  overlays,
  profile,
  route,
  services,
  settingsState,
  staff,
  workspace
}) {
  const { settings, setSettings, markWorkspaceDirty, showToast } = settingsState;
  const { dashboardGreeting, navigation } = useDashboardNavigationModel({
    activeTab: route.activeTab,
    accessLoading: auth.accessLoading,
    applyWorkspaceRoute: route.applyWorkspaceRoute,
    clientFirstTimers: clients.metrics.firstTimers,
    isGuestWorkspace: workspace.isGuestWorkspace,
    mobileNavCollapsed: editor.runtime.mobileNavCollapsed,
    mobileNavOpen: route.mobileNavOpen,
    navigateWorkspaceTab: route.navigateWorkspaceTab,
    onAuth: auth.openAuthPanel,
    onSignOut: auth.handleSignOut,
    playMobileNavSound: editor.runtime.playMobileNavSound,
    setActiveWorkspaceOwnerId: workspace.setActiveWorkspaceOwnerId,
    setMobileNavOpen: route.setMobileNavOpen,
    setSidebarCollapsed: route.setSidebarCollapsed,
    sidebarCollapsed: route.sidebarCollapsed,
    user: auth.user,
    visibleBookings: booking.visibleBookings,
    workspaceChoices: workspace.workspaceChoices,
    workspaceOwnerId: workspace.workspaceOwnerId,
    workspaceRole: workspace.workspaceRole
  });

  const setThemeFilterValue = (groupId, filterId) => {
    startTransition(() => {
      services.setThemeFilters(prev => {
        if (prev[groupId] === filterId) return prev;
        return { ...prev, [groupId]: filterId };
      });
    });
  };

  const currentServiceIndustry = services.themeFilters.industry || settings.serviceIndustry;
  const collectsClientPhone = settings.features?.collectClientPhone !== false;
  const collectsClientEmail = settings.features?.collectClientEmail !== false;
  const collectsClientNotes = Boolean(settings.features?.collectClientNotes);
  const emailUpdatesEnabled = settings.features?.emailUpdates !== false;

  return {
    isGuestWorkspace: workspace.isGuestWorkspace,
    mobileNavCollapsed: editor.runtime.mobileNavCollapsed,
    sidebarCollapsed: route.sidebarCollapsed,
    overlays: {
      accountDeleteOpen: account.accountDeleteOpen,
      accountDeleteText: account.accountDeleteText,
      authBusy: auth.authBusy,
      bookingInfoDialog: booking.runtime.bookingInfoDialog,
      confirmDialog: overlays.confirmDialog,
      deleteBooking: booking.actions.deleteBooking,
      getBookingService: booking.getBookingService,
      handleDeleteAccount: account.handleDeleteAccount,
      handleImageCropSave: media.handleImageCropSave,
      imageCropCommitRef: media.imageCropCommitRef,
      imageCropModal: media.imageCropModal,
      imageCropSaving: media.imageCropSaving,
      legalPanel: overlays.legalPanel,
      navigateWorkspaceTab: route.navigateWorkspaceTab,
      runningLateDialog: booking.actions.runningLateDialog,
      safeStaffList: staff.safeStaffList,
      setAccountDeleteOpen: account.setAccountDeleteOpen,
      setAccountDeleteText: account.setAccountDeleteText,
      setBookingInfoDialog: booking.runtime.setBookingInfoDialog,
      setConfirmDialog: overlays.setConfirmDialog,
      setImageCropModal: media.setImageCropModal,
      setLegalPanel: overlays.setLegalPanel,
      setRunningLateDialog: booking.actions.setRunningLateDialog,
      setShowOwnerManual: profile.setShowOwnerManual,
      showOwnerManual: profile.showOwnerManual,
      submitRunningLateDialog: booking.actions.submitRunningLateDialog,
      toast: overlays.toast
    },
    navigation,
    routes: {
      overview: { greeting: dashboardGreeting, name: workspace.dashboardGreetingName },
      profile: buildProfileRoute({
        account,
        app,
        auth,
        clients,
        editor,
        media,
        profile,
        route,
        settings,
        settingsState,
        showToast,
        workspace
      }),
      schedule: {
        googleCalendarAuth: calendar.googleCalendarAuth,
        googleCalendarSyncing: calendar.googleCalendarSyncing,
        settings,
        props: {
          settings,
          setSettings,
          onSave: workspace.workspaceRole === 'staff'
            ? settingsState.saveStaffCalendarSettings
            : settingsState.saveSettings,
          showToast,
          bookings: booking.visibleBookings,
          clientDirectory: clients.directory,
          staffList: staff.displayStaffList,
          activeStaffId: staff.activeStaffProfile?.id || 'owner',
          workspaceRole: workspace.workspaceRole,
          workspaceOwnerId: workspace.workspaceOwnerId,
          onSettingsDirty: markWorkspaceDirty,
          onConnectGoogleCalendar: calendar.connectGoogleCalendar,
          onSyncGoogleCalendar: calendar.syncGoogleCalendarBookings
        }
      },
      support: {
        props: {
          appId: app.appId,
          db: app.db,
          user: auth.user,
          workspaceOwnerId: workspace.workspaceOwnerId,
          isGuestWorkspace: workspace.isGuestWorkspace,
          bookings: booking.visibleBookings,
          clientDirectory: clients.directory,
          staffList: staff.displayStaffList,
          services: services.workspaceServices,
          updateBooking: booking.actions.updateBooking,
          onCreateManualBooking: booking.actions.createManualBookingFromChat,
          setActiveTab: route.setActiveTab,
          focusTarget: overlays.supportThreadFocus,
          showToast
        }
      },
      services: {
        handleSettingChange: settingsState.handleSettingChange,
        markWorkspaceDirty,
        saveWorkspaceSettingsPatch: settingsState.saveWorkspaceSettingsPatch,
        setSettings,
        setThemeFilterValue,
        settings,
        props: {
          settings,
          staffList: staff.displayStaffList,
          currentIndustry: currentServiceIndustry,
          canManageWorkspace: workspace.canManageWorkspace,
          workspaceOwnerId: workspace.workspaceOwnerId,
          onImageUpload: media.requestImageCropUpload,
          onImageDelete: media.deleteStorageAsset,
          showToast
        }
      },
      finance: {
        props: {
          appId: app.appId,
          workspaceOwnerId: workspace.workspaceOwnerId,
          isGuestWorkspace: workspace.isGuestWorkspace,
          canManageWorkspace: workspace.canManageWorkspace,
          showToast,
          bookings: finance.bookings,
          financeImports: finance.financeImports,
          onMarkBookingPaid: booking.actions.markBookingPaid
        }
      },
      clients: {
        props: {
          activeClient: clients.activeClient,
          clientDeskFilter: clients.clientDeskFilter,
          clientDeskFilters: clients.clientDeskFilters,
          clientLabelOptions: clients.clientLabelOptions,
          clientMobileView: clients.clientMobileView,
          clientNoteDraft: clients.clientNoteDraft,
          clientRecords: clients.clientRecords,
          clientSearch: clients.clientSearch,
          displayClients: clients.displayClients,
          getBookingService: booking.getBookingService,
          handleClientAvatarUpload: clients.actions.handleClientAvatarUpload,
          handleManualClientSubmit: clients.actions.handleManualClientSubmit,
          navigateWorkspaceTab: route.navigateWorkspaceTab,
          openBookingChat: booking.actions.openBookingChat,
          safeStaffList: staff.safeStaffList,
          saveClients: clients.actions.saveClients,
          setClientDeskFilter: clients.setClientDeskFilter,
          setClientMobileView: clients.setClientMobileView,
          setClientNoteDraft: clients.setClientNoteDraft,
          setClientSearch: clients.setClientSearch,
          setSelectedClientId: clients.setSelectedClientId,
          showToast,
          toggleClientLabel: clients.actions.toggleClientLabel,
          upsertClientRecord: clients.actions.upsertClientRecord
        }
      },
      staff: {
        props: {
          activeStaffProfile: staff.activeStaffProfile,
          canManageTeam: workspace.canManageTeam,
          createStaffMember: staff.actions.createStaffMember,
          displayStaffList: staff.displayStaffList,
          isFirebaseConfigured: app.isFirebaseConfigured,
          safeStaffList: staff.safeStaffList,
          saveStaff: staff.actions.saveStaff,
          selectedStaffFileId: staff.selectedStaffFileId,
          setSelectedStaffFileId: staff.setSelectedStaffFileId,
          setTeamPanelMode: staff.setTeamPanelMode,
          showToast,
          staffList: staff.staffList,
          teamPanelMode: staff.teamPanelMode,
          visibleBookings: booking.visibleBookings
        }
      },
      editor: {
        runtime: editor.runtime,
        props: {
          actions: {
            applyFontStylePreset: settingsState.applyFontStylePreset,
            applyStyleDirection: settingsState.applyEditorStyleDirection,
            addFaqItem: settingsState.addFaqItem,
            onAddToHomeScreen: app.handleAddToHomeScreen,
            onBookingComplete: booking.actions.handleBookingComplete,
            onFeatureChange: settingsState.handleFeatureChange,
            onSettingChange: settingsState.handleSettingChange,
            onSettingImageUpload: media.handleSettingImageUpload,
            removeFaqItem: settingsState.removeFaqItem,
            showToast,
            toggleFaqFeature: settingsState.toggleFaqFeature,
            updateFaqItem: settingsState.updateFaqItem
          },
          bookingPage: {
            copyToClipboard: app.copyToClipboard,
            launchPanel: editor.launchPanel,
            onOpen: editor.openBookingPage,
            onSave: settingsState.saveSettings,
            route: editor.bookingPageRoute,
            setLaunchPanel: editor.setLaunchPanel,
            url: editor.bookingPageUrl
          },
          colour: {
            categoryId: editor.colourCategoryId,
            detectedBrandSignal: editor.detectedBrandSignal,
            onApplyPatch: settingsState.applyEditorColorPatch,
            onReset: settingsState.resetEditorColors,
            setCategoryId: editor.setColourCategoryId
          },
          form: {
            collectsClientEmail,
            collectsClientNotes,
            collectsClientPhone,
            emailUpdatesEnabled
          },
          settings,
          staffList: staff.displayStaffList
        }
      },
      bookings: {
        activeStaffProfile: staff.activeStaffProfile,
        bookingRuntime: booking.runtime,
        displayStaffList: staff.displayStaffList,
        handleManualBookingSubmit: booking.actions.handleManualBookingSubmit,
        safeStaffList: staff.safeStaffList,
        workspaceServices: services.workspaceServices,
        props: {
          actions: {
            approveBooking: booking.actions.approveBooking,
            getBookingClientAvatar: booking.getBookingClientAvatar,
            getBookingService: booking.getBookingService,
            markBookingPaid: booking.actions.markBookingPaid,
            onSetBookingInfo: booking.runtime.setBookingInfoDialog,
            openBookingChat: booking.actions.openBookingChat,
            sendReviewToBooking: booking.actions.sendReviewToBooking,
            sendRunningLateToBooking: booking.actions.sendRunningLateToBooking,
            sendWaitlistToBooking: booking.actions.sendWaitlistToBooking,
            setConfirmDialog: overlays.setConfirmDialog,
            updateBooking: booking.actions.updateBooking
          }
        }
      }
    }
  };
}
