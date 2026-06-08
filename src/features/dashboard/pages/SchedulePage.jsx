import { lazy, Suspense } from 'react';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { LazySectionFallback } from '../../../components/AppLoading';

const BusinessCalendar = lazy(() => (
  import('../../../components/BusinessCalendar').then((module) => ({ default: module.BusinessCalendar }))
));

export const SchedulePage = ({
  activeStaffId,
  bookings,
  clientDirectory,
  googleCalendarState,
  onConnectGoogleCalendar,
  onSave,
  onSettingsDirty,
  onSyncGoogleCalendar,
  settings,
  setSettings,
  showToast,
  staffList,
  workspaceOwnerId,
  workspaceRole
}) => (
  <div className="schedule-page flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 lg:p-12 relative bg-white">
    <Suspense fallback={<LazySectionFallback label="Loading schedule" />}>
      <AppErrorBoundary compact label="Schedule" resetKey={`business-${workspaceOwnerId}`}>
        <BusinessCalendar
          settings={settings}
          setSettings={setSettings}
          onSave={onSave}
          showToast={showToast}
          bookings={bookings}
          clientDirectory={clientDirectory}
          staffList={staffList}
          activeStaffId={activeStaffId}
          workspaceRole={workspaceRole}
          onSettingsDirty={onSettingsDirty}
          googleCalendarState={googleCalendarState}
          onConnectGoogleCalendar={onConnectGoogleCalendar}
          onSyncGoogleCalendar={onSyncGoogleCalendar}
        />
      </AppErrorBoundary>
    </Suspense>
  </div>
);
