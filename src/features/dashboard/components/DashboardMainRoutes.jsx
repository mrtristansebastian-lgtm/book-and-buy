import { lazy, Suspense } from 'react';
import { LazySectionFallback } from '../../../components/AppLoading';
import { mergeStateIfChanged } from '../../workspace';
import { normalizeServiceList } from '../../../utils/services';
import { DashboardOverviewPage } from './DashboardOverviewPage';

const BookingsPage = lazy(() => import('../../bookings/pages/BookingsPage').then(module => ({ default: module.BookingsPage })));
const ClientsPage = lazy(() => import('../../clients/pages/ClientsPage').then(module => ({ default: module.ClientsPage })));
const EditorPage = lazy(() => import('../../editor/pages/EditorPage').then(module => ({ default: module.EditorPage })));
const ProfilePage = lazy(() => import('../../profile/pages/ProfilePage').then(module => ({ default: module.ProfilePage })));
const StaffPage = lazy(() => import('../../staff/pages/StaffPage').then(module => ({ default: module.StaffPage })));
const FinancePage = lazy(() => import('../pages/FinancePage').then(module => ({ default: module.FinancePage })));
const SchedulePage = lazy(() => import('../pages/SchedulePage').then(module => ({ default: module.SchedulePage })));
const ServicesPage = lazy(() => import('../pages/ServicesPage').then(module => ({ default: module.ServicesPage })));
const SupportInboxPage = lazy(() => import('../pages/SupportInboxPage').then(module => ({ default: module.SupportInboxPage })));

export function DashboardMainRoutes({
  activeTab,
  mobileNavCollapsed,
  routes
}) {
  const {
    bookings,
    clients,
    editor,
    finance,
    overview,
    profile,
    schedule,
    services,
    staff,
    support
  } = routes;

  return (
    <div className={`dashboard-main relative z-10 flex-1 flex overflow-hidden md:pb-0 ${activeTab === 'editor' && mobileNavCollapsed ? 'mobile-nav-space-collapsed' : ''}`}>
      {activeTab === 'overview' && (
        <DashboardOverviewPage greeting={overview.greeting} name={overview.name} {...overview.props} />
      )}

      {activeTab === 'profile' && (
        <Suspense fallback={<LazySectionFallback label="Loading profile" />}>
          <ProfilePage
            {...profile.props}
            onDeleteAccount={() => {
              profile.setAccountDeleteText('');
              profile.setAccountDeleteOpen(true);
            }}
            onOpenStyleRoom={() => {
              profile.setActiveTab('editor');
              profile.openEditorRoom('style');
            }}
          />
        </Suspense>
      )}

      {activeTab === 'business' && (
        <Suspense fallback={<LazySectionFallback label="Loading schedule" />}>
          <SchedulePage
            {...schedule.props}
            googleCalendarState={{
              connected: Boolean(schedule.googleCalendarAuth.accessToken),
              email: schedule.googleCalendarAuth.email || schedule.settings.googleCalendar?.connectedEmail || '',
              connectedAt: schedule.googleCalendarAuth.connectedAt || schedule.settings.googleCalendar?.connectedAt || 0,
              lastSyncedAt: schedule.settings.googleCalendar?.lastSyncedAt || 0,
              lastSyncCount: schedule.settings.googleCalendar?.lastSyncCount || 0,
              syncing: schedule.googleCalendarSyncing
            }}
          />
        </Suspense>
      )}

      {activeTab === 'communications' && (
        <Suspense fallback={<LazySectionFallback label="Loading inbox" />}>
          <SupportInboxPage {...support.props} />
        </Suspense>
      )}

      {activeTab === 'services' && (
        <Suspense fallback={<LazySectionFallback label="Loading services" />}>
          <ServicesPage
            {...services.props}
            onChooseIndustry={(industryId) => {
              services.handleSettingChange('serviceIndustry', industryId);
              if (industryId) services.setThemeFilterValue('industry', industryId);
            }}
            onUpdateSettings={async (nextSettings, message) => {
              const servicePatch = {
                services: normalizeServiceList(nextSettings.services || []),
                serviceIndustry: nextSettings.serviceIndustry || services.settings.serviceIndustry || ''
              };
              services.markWorkspaceDirty();
              services.setSettings(prev => mergeStateIfChanged(prev, { ...prev, ...servicePatch }));
              if (services.props.isGuestWorkspace) {
                services.props.showToast?.(message || 'Services saved for this guest session.');
                return true;
              }
              return services.saveWorkspaceSettingsPatch(servicePatch, message || 'Services saved.');
            }}
          />
        </Suspense>
      )}

      {activeTab === 'finance' && (
        <Suspense fallback={<LazySectionFallback label="Loading finance" />}>
          <FinancePage {...finance.props} />
        </Suspense>
      )}

      {activeTab === 'clients' && (
        <Suspense fallback={<LazySectionFallback label="Loading clients" />}>
          <ClientsPage {...clients.props} />
        </Suspense>
      )}

      {activeTab === 'staff' && (
        <Suspense fallback={<LazySectionFallback label="Loading team" />}>
          <StaffPage {...staff.props} />
        </Suspense>
      )}

      {activeTab === 'editor' && (
        <Suspense fallback={<LazySectionFallback label="Loading editor" />}>
          <EditorPage
            {...editor.props}
            actions={{
              ...editor.props.actions,
              onDeviceChange: editor.runtime.handleDeviceChange,
              openRoom: editor.runtime.openRoom
            }}
            editor={{
              collapsed: editor.runtime.collapsed,
              contentRef: editor.runtime.contentRef,
              device: editor.runtime.device,
              isPortraitMobileRuntime: editor.runtime.isPortraitMobileRuntime,
              mobileNavCollapsed: editor.runtime.mobileNavCollapsed,
              setCollapsed: editor.runtime.setCollapsed,
              setMobileNavCollapsed: editor.runtime.setMobileNavCollapsed,
              setStudioModal: editor.runtime.setStudioModal,
              studioModal: editor.runtime.studioModal
            }}
            preview={{
              containerRef: editor.runtime.containerRef,
              endRoomNavDrag: editor.runtime.endRoomNavDrag,
              frame: editor.runtime.frame,
              frameClass: editor.runtime.frameClass,
              isCompactViewport: editor.runtime.isCompactViewport,
              key: editor.runtime.previewKey,
              moveRoomNavDrag: editor.runtime.moveRoomNavDrag,
              previewStep: editor.runtime.previewStep,
              roomNavOffset: editor.runtime.roomNavOffset,
              scale: editor.runtime.scale,
              scrollRef: editor.runtime.previewScrollRef,
              setKey: editor.runtime.setPreviewKey,
              setPreviewStep: editor.runtime.setPreviewStep,
              setRoomNavOffset: editor.runtime.setRoomNavOffset,
              settings: editor.props.settings,
              shouldMount: editor.runtime.shouldMountPreview,
              showPortraitDesktopPrompt: editor.runtime.showPortraitDesktopPrompt,
              startRoomNavDrag: editor.runtime.startRoomNavDrag
            }}
          />
        </Suspense>
      )}

      {activeTab === 'bookings' && (
        <Suspense fallback={<LazySectionFallback label="Loading bookings" />}>
          <BookingsPage
            {...bookings.props}
            bookingDeskState={{
              bookingDesk: bookings.bookingRuntime.bookingDesk,
              bookingDeskPeriod: bookings.bookingRuntime.bookingDeskPeriod,
              bookingPaymentFilter: bookings.bookingRuntime.bookingPaymentFilter,
              bookingRows: bookings.bookingRuntime.bookingRows,
              bookingSearch: bookings.bookingRuntime.bookingSearch,
              bookingSort: bookings.bookingRuntime.bookingSort,
              onBookingDeskPeriodChange: bookings.bookingRuntime.setBookingDeskPeriod,
              onBookingFilterChange: bookings.bookingRuntime.setBookingFilter,
              onBookingPaymentFilterChange: bookings.bookingRuntime.setBookingPaymentFilter,
              onBookingSearchChange: bookings.bookingRuntime.setBookingSearch,
              onBookingSortChange: bookings.bookingRuntime.setBookingSort,
              safeStaffList: bookings.safeStaffList
            }}
            manualBooking={{
              activeStaffProfile: bookings.activeStaffProfile,
              displayStaffList: bookings.displayStaffList,
              isOpen: bookings.bookingRuntime.manualBookingOpen,
              manualBookingServiceId: bookings.bookingRuntime.manualBookingServiceId,
              onClose: () => bookings.bookingRuntime.setManualBookingOpen(false),
              onManualBookingServiceIdChange: bookings.bookingRuntime.setManualBookingServiceId,
              onOpen: () => {
                bookings.bookingRuntime.setManualBookingServiceId(bookings.workspaceServices[0]?.id || 'custom');
                bookings.bookingRuntime.setManualBookingOpen(true);
              },
              onSubmit: bookings.handleManualBookingSubmit,
              selectedManualBookingService: bookings.bookingRuntime.selectedManualBookingService,
              workspaceServices: bookings.workspaceServices
            }}
            rangeDialog={{
              bookingCustomRange: bookings.bookingRuntime.bookingCustomRange,
              isOpen: bookings.bookingRuntime.bookingRangeDialogOpen,
              onClose: () => bookings.bookingRuntime.setBookingRangeDialogOpen(false),
              onOpen: () => bookings.bookingRuntime.setBookingRangeDialogOpen(true),
              onSave: () => {
                bookings.bookingRuntime.setBookingDeskPeriod('custom');
                bookings.bookingRuntime.setBookingRangeDialogOpen(false);
              },
              setBookingCustomRange: bookings.bookingRuntime.setBookingCustomRange
            }}
          />
        </Suspense>
      )}
    </div>
  );
}
