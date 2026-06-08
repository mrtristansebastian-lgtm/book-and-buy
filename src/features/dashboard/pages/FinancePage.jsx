import { lazy, Suspense } from 'react';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { LazySectionFallback } from '../../../components/AppLoading';

const FinancePaymentSettings = lazy(() => (
  import('../../../components/FinancePaymentSettings').then((module) => ({ default: module.FinancePaymentSettings }))
));

export const FinancePage = ({
  appId,
  bookings,
  canManageWorkspace,
  financeImports,
  isGuestWorkspace,
  onMarkBookingPaid,
  showToast,
  workspaceOwnerId
}) => (
  <div className="finance-page flex-1 overflow-y-auto bg-white p-4 sm:p-6 md:p-10 lg:p-12">
    <Suspense fallback={<LazySectionFallback label="Loading finance" />}>
      <AppErrorBoundary compact label="Finance" resetKey={workspaceOwnerId}>
        <FinancePaymentSettings
          appId={appId}
          businessId={workspaceOwnerId}
          isGuestWorkspace={isGuestWorkspace}
          canManageWorkspace={canManageWorkspace}
          showToast={showToast}
          bookings={bookings}
          importedFinanceRecords={financeImports}
          onMarkBookingPaid={onMarkBookingPaid}
        />
      </AppErrorBoundary>
    </Suspense>
  </div>
);
