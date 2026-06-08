import { lazy, Suspense } from 'react';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { LazySectionFallback } from '../../../components/AppLoading';

const MigrationImportPanel = lazy(() => (
  import('../../finance/components/MigrationImportPanel').then((module) => ({ default: module.MigrationImportPanel }))
));

export const ProfileMigrationSection = ({
  activeProfileSection,
  canManageWorkspace,
  displayCurrency,
  importedMigrationCounts,
  onClearMigrationData,
  onImportMigrationCsv,
  showToast,
  workspaceOwnerId
}) => (
  <section className={`profile-section profile-section-migration ${activeProfileSection === 'migration' ? 'block' : 'hidden'}`}>
    <Suspense fallback={<LazySectionFallback label="Loading migration studio" />}>
      <AppErrorBoundary compact label="Migration Studio" resetKey={`${workspaceOwnerId}-${importedMigrationCounts.clients}-${importedMigrationCounts.bookings}-${importedMigrationCounts.financeRecords}`}>
        <MigrationImportPanel
          canManageWorkspace={canManageWorkspace}
          displayCurrency={displayCurrency}
          importedCounts={importedMigrationCounts}
          onImportMigrationCsv={onImportMigrationCsv}
          onClearMigrationData={onClearMigrationData}
          showToast={showToast}
        />
      </AppErrorBoundary>
    </Suspense>
  </section>
);
