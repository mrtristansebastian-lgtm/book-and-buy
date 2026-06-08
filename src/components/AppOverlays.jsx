import { CheckCircle2, X } from 'lucide-react';

export const NativeToast = ({ message }) => {
  if (!message) return null;

  return (
    <div className="native-toast fixed top-4 md:top-10 left-1/2 -translate-x-1/2 z-[9999] max-w-[calc(100vw-2rem)] px-5 md:px-8 py-3 md:py-4 bg-black text-white rounded-2xl md:rounded-full text-[10px] md:text-xs font-bold uppercase tracking-[0.18em] md:tracking-widest leading-relaxed shadow-2xl animate-in slide-in-from-top-10 fade-in duration-500 flex items-center gap-3 text-center">
      <CheckCircle2 size={16} className="text-[#39FF14] shrink-0" /> {message}
    </div>
  );
};

export const ConfirmActionDialog = ({ dialog, onCancel, onConfirm }) => {
  if (!dialog) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-md bg-white rounded-t-[1.5rem] sm:rounded-lg border border-neutral-100 shadow-2xl p-6 md:p-7 animate-in fade-in zoom-in-95 duration-300">
        <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-400 mb-3">{dialog.eyebrow || 'Confirm Action'}</p>
        <h2 className="text-2xl font-bold tracking-tight text-black mb-3">{dialog.title}</h2>
        <p className="text-sm leading-relaxed text-neutral-500 mb-6">{dialog.body}</p>
        {!!dialog.items?.length && (
          <div className="mb-6 rounded-lg border border-neutral-100 bg-neutral-50 p-3">
            {dialog.items.map((item, index) => (
              <div key={`${item}-${index}`} className="flex items-start gap-3 py-2 text-sm font-semibold leading-snug text-neutral-700">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-black" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={onCancel} className="h-12 rounded-full bg-white border border-neutral-200 text-black text-[10px] font-bold uppercase tracking-widest hover:border-black transition-colors">
            Cancel
          </button>
          <button type="button" onClick={onConfirm} className="h-12 rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors">
            {dialog.actionLabel || 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const LegalDialog = ({ pages, panel, onClose }) => {
  const page = panel && pages?.[panel];
  if (!page) return null;

  return (
    <div className="fixed inset-0 z-[1000] bg-black/45 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="w-full sm:max-w-lg bg-white rounded-t-[1.5rem] sm:rounded-lg border border-neutral-100 shadow-2xl p-6 md:p-8 animate-in fade-in zoom-in-95 duration-300 max-h-[calc(100dvh-1rem)] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-7">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.35em] text-neutral-400 mb-2">{page.eyebrow}</p>
            <h2 className="text-3xl font-bold tracking-tight text-black">{page.title}</h2>
          </div>
          <button type="button" aria-label="Close legal panel" onClick={onClose} className="w-10 h-10 rounded-full bg-neutral-100 text-neutral-400 flex items-center justify-center hover:text-black transition-colors shrink-0"><X size={16}/></button>
        </div>
        <div className="space-y-4">
          {page.body.map((paragraph) => (
            <p key={paragraph} className="text-sm leading-relaxed text-neutral-500">{paragraph}</p>
          ))}
        </div>
        <button type="button" onClick={onClose} className="mt-7 h-12 w-full rounded-full bg-black text-white text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors">
          Close
        </button>
      </div>
    </div>
  );
};
