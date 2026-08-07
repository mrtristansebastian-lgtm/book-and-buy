import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../../auth/AuthContext';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { getVisibleStaffForAvailability } from '../../../utils/staffAccess';
import {
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
  const [staffId, setStaffId] = useState(() => visibleStaff[0]?.id || staff[0]?.id || '');

  useEffect(() => {
    if (!visibleStaff.length) {
      setStaffId('');
      return;
    }
    if (!visibleStaff.some((member) => member.id === staffId)) {
      setStaffId(visibleStaff[0].id);
    }
  }, [visibleStaff, staffId]);

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
