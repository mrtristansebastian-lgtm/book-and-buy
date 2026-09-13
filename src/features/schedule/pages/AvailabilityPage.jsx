import { useEffect, useMemo, useState } from 'react';
import { Settings } from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  canEditAvailabilityRules,
  getVisibleStaffForAvailability
} from '../../../utils/staffAccess';
import {
  BUSINESS_AVAILABILITY_ID,
  ScheduleAvailabilityEditor,
  StaffAvailabilitySwitcher
} from '../components/ScheduleAvailabilityEditor';

export function AvailabilityPage() {
  const { user } = useAuth();
  const { staff, workspace, upsertStaffAvailability, updateAvailabilityRules } = useWorkspace();
  const visibleStaff = useMemo(
    () => getVisibleStaffForAvailability({ user, workspace, staff }),
    [user, workspace, staff]
  );
  const canEditRules = canEditAvailabilityRules({ user, workspace });
  const [staffId, setStaffId] = useState(() =>
    canEditRules
      ? BUSINESS_AVAILABILITY_ID
      : visibleStaff[0]?.id || staff[0]?.id || ''
  );
  const [studioSettingsOpen, setStudioSettingsOpen] = useState(false);

  useEffect(() => {
    if (staffId === BUSINESS_AVAILABILITY_ID) {
      if (!canEditRules && visibleStaff.length) setStaffId(visibleStaff[0].id);
      return;
    }
    if (!visibleStaff.length) {
      if (canEditRules) setStaffId(BUSINESS_AVAILABILITY_ID);
      else setStaffId('');
      return;
    }
    if (!visibleStaff.some((member) => member.id === staffId)) {
      setStaffId(visibleStaff[0].id);
    }
  }, [visibleStaff, staffId, canEditRules]);

  return (
    <div className="bb-schedule-desk">
      <header className="bb-schedule-desk-header bb-schedule-avail-page-header">
        <div className="bb-schedule-desk-copy">
          <div className="bb-schedule-avail-title-row">
            <div className="bb-page-title-wrap">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-schedule-desk-title">Availability Studio</h1>
            </div>
            {canEditRules ? (
              <button
                type="button"
                className="bb-schedule-avail-studio-settings"
                aria-label="Availability settings"
                title="Settings"
                onClick={() => setStudioSettingsOpen(true)}
              >
                <Settings size={18} strokeWidth={2.2} aria-hidden="true" />
              </button>
            ) : null}
          </div>
        </div>
        <div className="bb-schedule-desk-tools bb-schedule-avail-header-tools">
          <StaffAvailabilitySwitcher
            staff={visibleStaff}
            staffId={staffId}
            onSelect={setStaffId}
            businessName={workspace.brandName || 'Business'}
            businessLogoUrl={workspace.website?.logoUrl || ''}
            showBusiness
          />
        </div>
      </header>

      <ScheduleAvailabilityEditor
        staff={staff}
        staffId={staffId}
        onStaffIdChange={setStaffId}
        staffAvailability={workspace.staffAvailability || {}}
        availabilityRules={workspace.availabilityRules || {}}
        onSaveEntry={(id, entry) => upsertStaffAvailability(id, entry)}
        onUpdateRules={updateAvailabilityRules}
        studioSettingsOpen={studioSettingsOpen}
        onStudioSettingsOpenChange={setStudioSettingsOpen}
      />
    </div>
  );
}
