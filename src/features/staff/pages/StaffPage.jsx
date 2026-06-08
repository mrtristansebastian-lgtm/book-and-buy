import { StaffAddPanel } from '../components/StaffAddPanel';
import { StaffFilePanel } from '../components/StaffFilePanel';
import { StaffRoster } from '../components/StaffRoster';

const getStaffFile = ({ selectedStaffFile, visibleBookings }) => {
  if (!selectedStaffFile) return null;
  const assignedBookings = visibleBookings.filter(booking => (
    booking.staffId === selectedStaffFile.id ||
    (selectedStaffFile.id === 'owner' && (!booking.staffId || booking.staffId === 'owner'))
  ));
  const roleLabel = selectedStaffFile.role === 'admin'
    ? 'Admin'
    : selectedStaffFile.role === 'owner' || selectedStaffFile.id === 'owner'
      ? 'Owner'
      : 'Staff';
  const statusLabel = selectedStaffFile.status === 'connected'
    ? 'Google account detected'
    : selectedStaffFile.accessEnabled === false
      ? 'Access disabled'
      : 'Access ready';
  return { assignedBookings, roleLabel, statusLabel };
};

export const StaffPage = ({
  activeStaffProfile,
  canManageTeam,
  createStaffMember,
  displayStaffList,
  isFirebaseConfigured,
  safeStaffList,
  saveStaff,
  selectedStaffFileId,
  setSelectedStaffFileId,
  setTeamPanelMode,
  showToast,
  staffList,
  teamPanelMode,
  visibleBookings
}) => {
  const selectedStaffFile = displayStaffList.find(staff => staff.id === selectedStaffFileId) || null;
  const staffFile = getStaffFile({ selectedStaffFile, visibleBookings });
  const closeStaffPanel = () => {
    setTeamPanelMode('roster');
    setSelectedStaffFileId(null);
  };

  const handleSaveTeam = async () => {
    const saved = await saveStaff(staffList);
    if (saved) showToast('Team setup saved');
  };

  const handleRemoveStaff = async () => {
    const saved = await saveStaff(safeStaffList.filter(staff => staff.id !== selectedStaffFile.id));
    if (saved) closeStaffPanel();
  };

  return (
    <div className="team-page flex-1 overflow-y-auto bg-white p-4 sm:p-6 md:p-10 lg:p-12">
      <StaffRoster
        displayStaffList={displayStaffList}
        onAddStaff={() => {
          setTeamPanelMode('add');
          setSelectedStaffFileId(null);
        }}
        onSaveTeam={handleSaveTeam}
        onSelectStaff={(staffId) => {
          setSelectedStaffFileId(staffId);
          setTeamPanelMode('file');
        }}
        selectedStaffFileId={selectedStaffFileId}
        teamPanelMode={teamPanelMode}
      />

      <section className="mt-6">
        {teamPanelMode === 'add' ? (
          <StaffAddPanel
            canManageTeam={canManageTeam}
            createStaffMember={createStaffMember}
            isFirebaseConfigured={isFirebaseConfigured}
            onClose={() => setTeamPanelMode('roster')}
          />
        ) : (
          <StaffFilePanel
            activeStaffProfile={activeStaffProfile}
            canManageTeam={canManageTeam}
            onClose={closeStaffPanel}
            onRemoveStaff={handleRemoveStaff}
            selectedStaffFile={selectedStaffFile}
            staffFile={staffFile}
          />
        )}
      </section>
    </div>
  );
};
