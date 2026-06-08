import { Plus, X } from 'lucide-react';

export const ClientAddPanel = ({
  clientLabelOptions,
  isVisible,
  onClose,
  onSubmit
}) => (
  <section className={`saas-panel p-4 md:p-6 ${isVisible ? '' : 'hidden'}`}>
    <div className="flex items-start justify-between gap-4 mb-6">
      <div>
        <h3 className="text-lg font-bold tracking-tight text-black">Add Client</h3>
        <p className="text-sm text-neutral-500">Create a profile for walk-ins, DMs, or referrals.</p>
      </div>
      <button type="button" onClick={onClose} className="w-10 h-10 rounded-lg bg-black text-white flex items-center justify-center shrink-0"><X size={16} /></button>
    </div>
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Name</label>
        <input name="clientName" type="text" placeholder="Client name" required className="w-full h-12 bg-white border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none text-black focus:border-black transition-colors" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Phone</label>
          <input name="clientPhone" type="tel" placeholder="+27 82 000 0000" className="w-full h-12 bg-white border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none text-black focus:border-black transition-colors" />
        </div>
        <div>
          <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Birthday</label>
          <input name="clientBirthday" type="text" placeholder="08/14" className="w-full h-12 bg-white border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none text-black focus:border-black transition-colors" />
        </div>
      </div>
      <div>
        <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Email</label>
        <input name="clientEmail" type="email" placeholder="client@email.com" className="w-full h-12 bg-white border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none text-black focus:border-black transition-colors" />
      </div>
      <div>
        <label className="text-[9px] font-bold uppercase tracking-[0.25em] text-neutral-400 block mb-2">Starting Label</label>
        <select name="clientLabel" className="w-full h-12 bg-white border border-neutral-200 rounded-lg px-4 text-sm font-bold outline-none text-black focus:border-black transition-colors">
          <option value="">No manual label</option>
          {clientLabelOptions.map(label => <option key={label} value={label}>{label}</option>)}
        </select>
      </div>
      <button type="submit" className="w-full h-12 bg-black text-white rounded-lg flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors shadow-xl shadow-black/10">
        <Plus size={15} /> Add Client
      </button>
    </form>
  </section>
);
