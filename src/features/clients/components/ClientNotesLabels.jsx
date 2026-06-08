import { Check, MessageSquare, Plus, Tag } from 'lucide-react';

export const ClientNotesLabels = ({
  activeClient,
  clientLabelOptions,
  clientNoteDraft,
  isExampleClient,
  onNoteDraftChange,
  onSaveNotes,
  onToggleLabel,
  showToast
}) => (
  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
    <section className="saas-card p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-black">Staff Notes</h3>
          <p className="text-sm text-neutral-500">Preferences, follow-ups, and context for the next visit.</p>
        </div>
        <MessageSquare size={18} className="text-neutral-300" />
      </div>
      <textarea
        value={isExampleClient ? activeClient.notes : clientNoteDraft}
        onChange={(event) => onNoteDraftChange(event.target.value)}
        placeholder="Example: prefers morning slots, wants app updates, allergic to latex..."
        disabled={isExampleClient}
        className="w-full min-h-[190px] bg-neutral-50 border border-neutral-100 rounded-lg p-4 text-sm font-medium outline-none resize-none focus:bg-white focus:border-black transition-colors disabled:text-neutral-500"
      />
      <button disabled={isExampleClient} onClick={async () => {
        const saved = await onSaveNotes(activeClient.id, { notes: clientNoteDraft });
        if (saved) showToast('Client notes saved');
      }} className="mt-4 w-full h-11 rounded-lg bg-black text-white flex items-center justify-center gap-2 text-[10px] font-bold uppercase tracking-widest hover:bg-neutral-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
        <Check size={15} /> {isExampleClient ? 'Example Only' : 'Save Notes'}
      </button>
    </section>

    <section className="saas-panel p-5 md:p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-black">Labels</h3>
          <p className="text-sm text-neutral-500">Auto labels update from booking behavior. Staff labels stay pinned.</p>
        </div>
        <Tag size={18} className="text-neutral-400" />
      </div>
      <div className="space-y-3">
        {clientLabelOptions.map(label => {
          const active = activeClient.labels?.includes(label);
          return (
            <button
              key={label}
              disabled={isExampleClient}
              onClick={() => onToggleLabel(activeClient, label)}
              className={`w-full h-12 rounded-lg px-4 flex items-center justify-between gap-4 text-sm font-bold transition-colors disabled:opacity-45 disabled:cursor-not-allowed ${active ? 'bg-black text-white shadow-xl shadow-black/10' : 'bg-white border border-neutral-200 text-neutral-600 hover:text-black hover:border-black'}`}
            >
              <span>{label}</span>
              {active ? <Check size={15} className="text-[#39FF14]" /> : <Plus size={15} className="text-neutral-300" />}
            </button>
          );
        })}
      </div>
    </section>
  </div>
);
