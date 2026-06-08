import { lazy, Suspense } from 'react';
import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { LazySectionFallback } from '../../../components/AppLoading';

const ServicesStudio = lazy(() => (
  import('../../../components/ServicesStudio').then((module) => ({ default: module.ServicesStudio }))
));

export const ServicesPage = ({
  canManageWorkspace,
  currentIndustry,
  onChooseIndustry,
  onImageDelete,
  onImageUpload,
  onUpdateSettings,
  settings,
  showToast,
  staffList,
  workspaceOwnerId
}) => (
  <div className="services-page flex-1 overflow-y-auto bg-white p-4 sm:p-6 md:p-10 lg:p-12">
    <Suspense fallback={<LazySectionFallback label="Loading service studio" />}>
      <AppErrorBoundary compact label="Services" resetKey={`${workspaceOwnerId}-${settings.serviceIndustry || 'services'}`}>
        <ServicesStudio
          settings={settings}
          staffList={staffList}
          currentIndustry={currentIndustry}
          canManageWorkspace={canManageWorkspace}
          onChooseIndustry={onChooseIndustry}
          onUpdateSettings={onUpdateSettings}
          onImageUpload={onImageUpload}
          onImageDelete={onImageDelete}
          showToast={showToast}
        />
      </AppErrorBoundary>
    </Suspense>
  </div>
);
