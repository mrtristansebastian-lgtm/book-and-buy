import { Camera, History } from 'lucide-react';

export const ClientProfileHeader = ({
  activeClient,
  allLabels,
  isExampleClient,
  onAvatarUpload,
  onOpenBookings
}) => (
  <div className="saas-card p-4 md:p-6 overflow-hidden relative">
    <div className="absolute top-0 left-0 right-0 h-1 bg-[#39FF14]" />
    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-5 md:gap-6 mb-5 md:mb-8">
      <div className="flex items-start gap-4 md:gap-5 min-w-0">
        <div className="relative shrink-0">
          <div className="w-16 h-16 md:w-24 md:h-24 rounded-lg bg-black text-[#39FF14] overflow-hidden flex items-center justify-center text-2xl md:text-4xl font-bold shadow-inner">
            {activeClient.avatar ? <img src={activeClient.avatar} className="w-full h-full object-cover" /> : activeClient.name.charAt(0)}
          </div>
          {!isExampleClient && (
            <label className="absolute -right-2 -bottom-2 w-9 h-9 md:w-10 md:h-10 rounded-lg bg-white border border-neutral-200 shadow-xl flex items-center justify-center cursor-pointer hover:bg-neutral-50 transition-colors" title="Upload profile picture">
              <Camera size={15} />
              <input type="file" accept="image/*" className="hidden" onChange={(event) => {
                onAvatarUpload(activeClient.id, event.target.files[0]);
                event.target.value = '';
              }} />
            </label>
          )}
        </div>
        <div className="min-w-0 pt-1">
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <h3 className="text-2xl md:text-4xl font-bold tracking-tight text-black truncate">{activeClient.name}</h3>
            {isExampleClient && <span className="px-2.5 py-1 rounded-md bg-black text-white text-[9px] font-bold uppercase tracking-widest">Example Only</span>}
            {activeClient.autoLabels?.includes('Regular') && <span className="px-2.5 py-1 rounded-md bg-[#39FF14] text-black text-[9px] font-bold uppercase tracking-widest">Regular</span>}
          </div>
          <p className="text-xs md:text-sm text-neutral-500 mb-3 md:mb-4">{isExampleClient ? 'Visual example only - not saved, synced, or counted in stats' : activeClient.bookingCount ? `${activeClient.bookingCount} booking${activeClient.bookingCount === 1 ? '' : 's'} on file` : 'Manual client profile'}</p>
          <div className="flex flex-wrap gap-2">
            {allLabels.map(label => (
              <span key={label} className={`px-3 py-1.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${label === 'Regular' || label === 'VIP' ? 'bg-[#39FF14] text-black' : label === 'No-show Risk' ? 'bg-red-50 text-red-600' : 'bg-neutral-100 text-neutral-500'}`}>{label}</span>
            ))}
          </div>
        </div>
      </div>
      <button onClick={onOpenBookings} className="h-11 px-5 rounded-lg border border-neutral-200 bg-white text-[10px] font-bold uppercase tracking-widest text-neutral-600 hover:text-black hover:bg-neutral-50 transition-colors flex items-center justify-center gap-2">
        <History size={15} /> Open Bookings
      </button>
    </div>
  </div>
);
