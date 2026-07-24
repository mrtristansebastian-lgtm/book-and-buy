import { AppErrorBoundary } from '../../../components/AppErrorBoundary';
import { ServicesStudio } from '../../../components/ServicesStudio';

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
  </div>
);
