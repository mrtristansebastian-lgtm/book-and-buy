import { X } from 'lucide-react';

export const AccountDeleteDialog = ({ open, text, busy, onTextChange, onClose, onDelete }) => {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-[1.5rem] sm:rounded-lg border border-neutral-100 shadow-2xl p-6 md:p-7 animate-in fade-in zoom-in-95 duration-300">
        <div className="flex items-start justify-between gap-4 mb-5">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-red-500 mb-3">Delete Account</p>
            <h2 className="text-2xl font-bold text-black">Permanently remove this account?</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-500">
              This removes the signed-in account profile from Build A Booking. Type DELETE to confirm.
            </p>
          </div>
          <button type="button" aria-label="Close account deletion" onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-50 border border-neutral-100 flex items-center justify-center text-neutral-500 hover:text-black transition-colors">
            <X size={16} />
          </button>
        </div>
        <label className="block mb-6">
          <span className="block text-[9px] font-bold uppercase tracking-[0.12em] text-neutral-400 mb-2">Confirmation</span>
          <input
            value={text}
            onChange={(event) => onTextChange(event.target.value)}
            placeholder="Type DELETE"
            className="w-full h-12 rounded-lg bg-neutral-50 border border-neutral-100 px-4 text-sm font-bold text-black outline-none focus:bg-white focus:border-black transition-colors"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onClose} className="h-12 rounded-full bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-[0.12em] hover:border-black transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onDelete} disabled={busy || text.trim().toUpperCase() !== 'DELETE'} className="h-12 rounded-full bg-red-500 text-white text-[10px] font-bold uppercase tracking-[0.12em] disabled:opacity-40 disabled:cursor-not-allowed hover:bg-red-600 transition-colors">
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};
