import { Trash2, Users, X } from 'lucide-react';
import { StaffAvatar } from './StaffAvatar';

export const StaffFilePanel = ({
  activeStaffProfile,
  canManageTeam,
  onClose,
  onRemoveStaff,
  selectedStaffFile,
  staffFile
}) => {
  if (!selectedStaffFile || !staffFile) {
    return (
      <div className="team-empty-state saas-card p-8 md:p-10 text-center">
        <div className="w-14 h-14 rounded-full bg-neutral-100 flex items-center justify-center mx-auto mb-4 text-neutral-400"><Users size={22} /></div>
        <h3 className="text-xl font-bold tracking-tight text-black">Choose a teammate</h3>
        <p className="text-sm text-neutral-500 mt-2">Open a staff file from the row above, or tap the plus icon to invite someone.</p>
      </div>
    );
  }

  return (
    <div className="team-file-panel saas-card p-5 md:p-6 overflow-hidden relative">
      <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(90deg,#39FF14,#7dd3fc,#c4b5fd,#f9a8d4)]" />
      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 mb-6">
        <div className="flex items-start gap-4 min-w-0">
          <StaffAvatar staff={selectedStaffFile} sizeClass="w-16 h-16 md:w-20 md:h-20" />
          <div className="min-w-0 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-black truncate">{selectedStaffFile.name}</h3>
              <span className="px-2.5 py-1 rounded-md bg-neutral-100 text-neutral-500 text-[9px] font-bold uppercase tracking-widest">{staffFile.roleLabel}</span>
            </div>
            <p className="text-sm text-neutral-500 mt-2 truncate">{selectedStaffFile.email || 'No email on file'}</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-neutral-400 mt-2">{staffFile.statusLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {selectedStaffFile.id !== 'owner' && canManageTeam && (
            <button onClick={onRemoveStaff} className="h-10 px-4 rounded-lg border border-red-100 bg-red-50 text-red-600 text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
              <Trash2 size={14} /> Remove
            </button>
          )}
          <button type="button" onClick={onClose} className="h-10 px-4 rounded-lg bg-black text-white text-[10px] font-bold uppercase tracking-widest flex items-center gap-2">
            <X size={14} /> Close
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Assigned Bookings</p>
          <p className="metric-value text-2xl font-bold text-black">{staffFile.assignedBookings.length}</p>
        </div>
        <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Calendar</p>
          <p className="text-sm font-bold text-black">{selectedStaffFile.id === activeStaffProfile?.id ? 'Your default view' : 'View profile'}</p>
        </div>
        <div className="rounded-lg bg-neutral-50 border border-neutral-100 p-4">
          <p className="text-[9px] font-bold uppercase tracking-widest text-neutral-400 mb-1">Access</p>
          <p className="text-sm font-bold text-black">{selectedStaffFile.accessEnabled === false ? 'Off' : 'On'}</p>
        </div>
      </div>
    </div>
  );
};
