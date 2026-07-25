import { lazy, Suspense } from 'react';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
const BusinessCalendar = lazy(() => (
  import('../../../components/BusinessCalendar.jsx?schedule-fcfs-v2').then((module) => ({ default: module.BusinessCalendar }))
));

const ScheduleCalendarSkeleton = () => (
  <div className="schedule-calendar-skeleton" aria-busy="true" aria-label="Loading schedule">
    <div className="schedule-calendar-skeleton-toolbar">
      <span />
      <span />
      <span />
    </div>
    <div className="schedule-calendar-skeleton-days">
      {Array.from({ length: 7 }, (_, index) => <span key={index} />)}
    </div>
    <div className="schedule-calendar-skeleton-grid" />
  </div>
);

export const SchedulePage = ({
  activeStaffId,
  bookings,
  clientDirectory,
  exampleMode,
  googleCalendarState,
  onCreateManualBooking,
  onConnectGoogleCalendar,
  onOpenBookingChat,
  onSave,
  onSettingsDirty,
  onSyncGoogleCalendar,
  onUpdateBooking,
  services,
  settings,
  setSettings,
  showToast,
  staffList,
  workspaceOwnerId,
  workspaceRole
}) => (
  <div className="schedule-page flex-1 overflow-y-auto relative bg-white">
    <Suspense fallback={<ScheduleCalendarSkeleton />}>
      <AppErrorBoundary compact label="Schedule" resetKey={`business-${workspaceOwnerId}`}>
        <BusinessCalendar
          settings={settings}
          setSettings={setSettings}
          onSave={onSave}
          showToast={showToast}
          bookings={bookings}
          clientDirectory={clientDirectory}
          exampleMode={exampleMode}
          staffList={staffList}
          services={services}
          activeStaffId={activeStaffId}
          workspaceRole={workspaceRole}
          onSettingsDirty={onSettingsDirty}
          googleCalendarState={googleCalendarState}
          onConnectGoogleCalendar={onConnectGoogleCalendar}
          onCreateManualBooking={onCreateManualBooking}
          onOpenBookingChat={onOpenBookingChat}
          onSyncGoogleCalendar={onSyncGoogleCalendar}
          onUpdateBooking={onUpdateBooking}
        />
      </AppErrorBoundary>
    </Suspense>
  </div>
);
