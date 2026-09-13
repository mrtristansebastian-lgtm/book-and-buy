import { useEffect, useMemo, useState } from 'react';
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
          <p className="bb-schedule-desk-eyebrow">Book</p>
          <h1 className="bb-schedule-desk-title">Availability Studio</h1>
          <p className="bb-schedule-desk-lede">Manage availability statuses and shifts.</p>
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
      />
    </div>
  );
}
