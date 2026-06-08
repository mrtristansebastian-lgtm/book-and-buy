import { Check, FileText, MessageCircle, Plus, Search, Users } from 'lucide-react';

export const ClientDirectory = ({
  activeClient,
  clientDeskFilter,
  clientDeskFilters,
  clientMobileView,
  clientSearch,
  displayClients,
  onAddClient,
  onOpenBookingChat,
  onOpenClient,
  onSaveClientBook,
  onSearchChange,
  onSetFilter,
  showToast
}) => (
  <div data-tour="clients-directory" className={`saas-card client-directory-card overflow-hidden ${clientMobileView === 'add' ? 'hidden md:block' : ''}`}>
    <div className="client-directory-command p-4 md:p-5 border-b border-neutral-100">
      <div className="client-directory-tools">
        <div className="client-directory-topline">
          <div className="client-search-wrap relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-300" />
            <input
              value={clientSearch}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search name, phone, label"
              aria-label="Search clients"
              className="client-search-input w-full h-11 md:h-12 bg-white border border-neutral-200 rounded-xl pl-11 pr-4 text-sm font-bold outline-none text-black focus:bg-white focus:border-black transition-colors"
            />
          </div>
          <div className="client-directory-actions">
            <button
              type="button"
              onClick={onAddClient}
              className="client-directory-action"
            >
              <Plus size={15} /> Client
            </button>
            <button
              type="button"
              onClick={onSaveClientBook}
              className="client-directory-action is-primary"
            >
              <Check size={15} /> Save
            </button>
          </div>
        </div>
        <div className="client-filter-tabs mt-3 grid grid-cols-3 gap-1.5">
          {clientDeskFilters.map(filter => {
            const FilterIcon = filter.icon || Users;
            return (
              <button
                key={filter.id}
                type="button"
                onClick={() => onSetFilter(filter.id)}
                className={`client-filter-tab h-10 rounded-lg border text-[9px] font-bold uppercase tracking-widest flex items-center justify-center gap-2 transition-all ${clientDeskFilter === filter.id ? 'is-active bg-black text-white border-black shadow-lg shadow-black/10' : 'bg-white border-transparent text-neutral-500 hover:text-black hover:bg-white'}`}
              >
                <FilterIcon size={13} />
                <span>{filter.label}</span>
                <span className={`client-filter-count rounded-full px-2 py-0.5 ${clientDeskFilter === filter.id ? 'bg-white/15 text-white' : 'bg-neutral-100 text-neutral-500'}`}>{filter.count}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
    <div className="max-h-[58vh] md:max-h-[640px] overflow-y-auto divide-y divide-neutral-100">
      {displayClients.length === 0 ? (
        <div className="p-12 text-center">
          <div className="w-14 h-14 rounded-lg bg-neutral-100 flex items-center justify-center mx-auto mb-5 text-neutral-400"><Users size={22} /></div>
          <h3 className="text-lg font-bold tracking-tight text-black mb-2">No clients found</h3>
          <p className="text-sm text-neutral-500">Try another search or add someone manually.</p>
        </div>
      ) : displayClients.map(client => {
        const allLabels = Array.from(new Set([...(client.autoLabels || []), ...(client.labels || [])])).slice(0, 3);
        const isActive = activeClient?.id === client.id;
        const openClientFile = () => onOpenClient(client.id);
        const openClientChat = () => {
          const latestBooking = client.bookings?.[0] || client.lastBooking;
          if (!latestBooking?.id) {
            showToast('This client needs a booking before a chat thread can open.');
            return;
          }
          onOpenBookingChat(latestBooking);
        };
        return (
          <div
            key={client.id}
            className={`client-directory-row w-full p-3 md:p-5 transition-all ${isActive ? 'is-active bg-black text-white' : 'hover:bg-neutral-50 text-black'}`}
          >
            <div className="flex items-start gap-3 md:gap-4">
              <button
                type="button"
                onClick={openClientFile}
                className={`w-11 h-11 md:w-14 md:h-14 rounded-lg overflow-hidden flex items-center justify-center font-bold text-base md:text-xl shrink-0 ${isActive ? 'bg-white text-black' : 'bg-neutral-100 text-black'}`}
                aria-label={`Open ${client.name} file`}
              >
                {client.avatar ? <img src={client.avatar} className="w-full h-full object-cover" /> : (client.name || '?').charAt(0)}
              </button>
              <button type="button" onClick={openClientFile} className="min-w-0 flex-1 text-left">
                <div className="flex items-start justify-between gap-3 mb-1">
                  <h4 className="text-base md:text-lg font-bold tracking-tight truncate">{client.name}</h4>
                </div>
                <p className={`text-xs md:text-sm truncate mb-2 md:mb-3 ${isActive ? 'text-white/55' : 'text-neutral-500'}`}>{client.isExample ? 'Preview only - not saved or counted' : client.phone || client.email || 'Manual profile'}</p>
                <div className="flex flex-wrap gap-1.5 md:gap-2">
                  {allLabels.map(label => (
                    <span key={label} className={`px-2 py-1 rounded-md text-[7px] md:text-[8px] font-bold uppercase tracking-widest ${isActive ? 'bg-white/10 text-white' : label === 'Regular' || label === 'VIP' ? 'bg-[#39FF14] text-black' : 'bg-neutral-100 text-neutral-500'}`}>{label}</span>
                  ))}
                </div>
              </button>
              <div className="client-row-actions flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={openClientFile}
                  aria-label={`Open ${client.name} file`}
                  title="Open file"
                  className={`client-row-action ${isActive ? 'is-active' : ''}`}
                >
                  <FileText size={15} />
                </button>
                <button
                  type="button"
                  onClick={openClientChat}
                  aria-label={`Open ${client.name} chat`}
                  title="Open chat"
                  className={`client-row-action ${isActive ? 'is-active' : ''}`}
                >
                  <MessageCircle size={15} />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  </div>
);
