import { Plus, X } from 'lucide-react';

export const StaffAddPanel = ({
  canManageTeam,
  createStaffMember,
  isFirebaseConfigured,
  onClose
}) => {
  const handleSubmit = async (event) => {
    event.preventDefault();
    const name = event.target.name.value.trim();
    const email = event.target.email.value.trim();
    const color = event.target.color.value;
    const role = event.target.role.value;
    if (name && email) {
      const saved = await createStaffMember({ name, email, color, role });
      if (saved) {
        event.target.reset();
        onClose();
      }
    }
  };

  return (
    <div className="team-add-panel saas-panel p-5 md:p-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h3 className="text-2xl font-bold tracking-tight text-black">Add Teammate</h3>
          <p className="text-sm text-neutral-500">Grant workspace access by email. Existing Google accounts are detected automatically.</p>
        </div>
        <button type="button" aria-label="Close teammate form" onClick={onClose} className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0"><X size={16} /></button>
      </div>
      <form onSubmit={handleSubmit} className="space-y-4">
        {!canManageTeam && isFirebaseConfigured && (
          <div className="rounded-lg bg-amber-50 border border-amber-100 p-4 text-xs font-bold text-amber-800 leading-relaxed">
            Your staff role can assign bookings and manage clients, but only owners/admins can grant team access.
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Name</label>
            <input name="name" type="text" placeholder="Staff member" required disabled={!canManageTeam && isFirebaseConfigured} className="w-full h-12 bg-white border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none text-black focus:border-black transition-colors disabled:opacity-50" />
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Email</label>
            <input name="email" type="email" placeholder="ari@studio.com" required disabled={!canManageTeam && isFirebaseConfigured} className="w-full h-12 bg-white border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none text-black focus:border-black transition-colors disabled:opacity-50" />
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-3">
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Access Role</label>
            <select name="role" defaultValue="staff" disabled={!canManageTeam && isFirebaseConfigured} className="w-full h-12 bg-white border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none text-black focus:border-black transition-colors disabled:opacity-50">
              <option value="staff">Staff - bookings and clients</option>
              <option value="admin">Admin - settings and team</option>
            </select>
          </div>
          <div>
            <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Color</label>
            <input name="color" type="color" defaultValue="#39FF14" disabled={!canManageTeam && isFirebaseConfigured} className="w-14 h-12 rounded-lg cursor-pointer bg-transparent border-none p-0 outline-none disabled:opacity-50" />
          </div>
        </div>
        <button type="submit" disabled={!canManageTeam && isFirebaseConfigured} className="w-full h-12 bg-black text-white rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors shadow-xl shadow-black/10 disabled:opacity-40 disabled:cursor-not-allowed">
          <Plus size={15} /> Add Member
        </button>
      </form>
    </div>
  );
};
