import { Check, Plus } from 'lucide-react';
import { StaffAvatar } from './StaffAvatar';

const getStaffRoleLabel = (staff = {}) => (
  staff.role === 'admin' ? 'Admin' : staff.role === 'owner' || staff.id === 'owner' ? 'Owner' : 'Staff'
);

export const StaffRoster = ({
  displayStaffList,
  onAddStaff,
  onSaveTeam,
  onSelectStaff,
  selectedStaffFileId,
  teamPanelMode
}) => (
  <section data-tour="team-roster" className="team-roster-shell saas-card p-4 md:p-6 overflow-hidden">
    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-5 mb-6">
      <div>
        <h3 className="text-xl md:text-2xl font-bold tracking-tight text-black">Team Roster</h3>
        <p className="text-sm text-neutral-500">Floating profiles for staff files, assignment checks, and calendar ownership.</p>
      </div>
      <div className="team-roster-actions">
        <span className="team-roster-active-count inline-flex w-fit text-[10px] font-bold uppercase tracking-widest text-neutral-500 bg-neutral-100 px-3 py-1.5 rounded-md">{displayStaffList.length} Active</span>
        <button onClick={onSaveTeam} className="team-save-inline-button">
          <Check size={14} /> Save Team
        </button>
      </div>
    </div>
    <div className="team-roster-rail flex gap-3 md:gap-4 overflow-x-auto no-scrollbar pb-2">
      <button
        type="button"
        onClick={onAddStaff}
        className={`team-roster-card min-w-[92px] md:min-w-[110px] rounded-2xl border p-3 md:p-4 flex flex-col items-center gap-3 transition-all ${teamPanelMode === 'add' ? 'bg-black text-white border-black shadow-xl shadow-black/10' : 'bg-white border-neutral-200 text-black hover:border-black'}`}
      >
        <span className={`w-14 h-14 rounded-full flex items-center justify-center ${teamPanelMode === 'add' ? 'bg-white text-black' : 'bg-neutral-100 text-black'}`}><Plus size={22} /></span>
        <span className="text-[9px] font-bold uppercase tracking-widest">Add</span>
      </button>
      {displayStaffList.map(staff => {
        const isSelected = teamPanelMode === 'file' && selectedStaffFileId === staff.id;
        const roleLabel = getStaffRoleLabel(staff);
        return (
          <button
            key={staff.id}
            type="button"
            onClick={() => onSelectStaff(staff.id)}
            className={`team-roster-card min-w-[112px] md:min-w-[132px] rounded-2xl border p-3 md:p-4 flex flex-col items-center gap-3 transition-all ${isSelected ? 'bg-black text-white border-black shadow-xl shadow-black/10' : 'bg-white border-neutral-200 text-black hover:border-black hover:shadow-lg'}`}
          >
            <StaffAvatar staff={staff} />
            <span className="w-full text-center">
              <span className="block text-[10px] md:text-xs font-bold truncate">{staff.name}</span>
              <span className={`block text-[8px] font-bold uppercase tracking-widest mt-1 ${isSelected ? 'text-white/55' : 'text-neutral-400'}`}>{roleLabel}</span>
            </span>
          </button>
        );
      })}
    </div>
  </section>
);
