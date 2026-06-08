import { lazy, Suspense } from 'react';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { LazySectionFallback } from '../../../components/AppLoading';

const WorkspaceInbox = lazy(() => (
  import('../../../components/WorkspaceInbox').then((module) => ({ default: module.WorkspaceInbox }))
));

export const SupportInboxPage = ({
  appId,
  bookings,
  clientDirectory,
  db,
  focusTarget,
  isGuestWorkspace,
  onCreateManualBooking,
  services,
  setActiveTab,
  showToast,
  staffList,
  updateBooking,
  user,
  workspaceOwnerId
}) => (
  <div className="communications-page flex-1 overflow-y-auto p-4 sm:p-6 md:p-10 lg:p-12 relative bg-white">
    <div className="support-page-shell max-w-[88rem] mx-auto">
      <Suspense fallback={<LazySectionFallback label="Loading client inbox" />}>
        <AppErrorBoundary compact label="Support Inbox" resetKey={`${workspaceOwnerId}-${focusTarget?.requestId || 'inbox'}`}>
          <WorkspaceInbox
            appId={appId}
            db={db}
            user={user}
            workspaceOwnerId={workspaceOwnerId}
            isGuestWorkspace={isGuestWorkspace}
            bookings={bookings}
            clientDirectory={clientDirectory}
            staffList={staffList}
            services={services}
            updateBooking={updateBooking}
            onCreateManualBooking={onCreateManualBooking}
            setActiveTab={setActiveTab}
            focusTarget={focusTarget}
            showToast={showToast}
          />
        </AppErrorBoundary>
      </Suspense>
    </div>
  </div>
);
