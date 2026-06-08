import { Briefcase, Edit3, Plus } from 'lucide-react';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';

export function ServiceDeskList({
  filteredServices,
  services,
  staffOptions,
  selectedId,
  onCreateService,
  onOpenService,
  canManageWorkspace
}) {
  return (
    <div className="service-desk-list divide-y divide-neutral-100">
      {filteredServices.length === 0 ? (
        <div className="p-8 md:p-10 text-center">
          <div className="w-14 h-14 rounded-2xl bg-neutral-100 inline-flex items-center justify-center mb-4">
            <Briefcase size={22} />
          </div>
          <h3 className="text-xl font-black text-black">{services.length ? 'No matching services' : 'No services yet'}</h3>
          <p className="text-sm text-neutral-500 mt-2 max-w-md mx-auto">
            {services.length ? 'Try another search, category, staff member, or status.' : 'Create your first service so the booking page has something clients can choose.'}
          </p>
          <button
            type="button"
            onClick={onCreateService}
            disabled={!canManageWorkspace}
            className="mt-5 h-11 px-5 rounded-xl bg-black text-white text-[10px] font-black uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <Plus size={14} /> Create Service
          </button>
        </div>
      ) : filteredServices.map(service => {
        const assignedStaff = staffOptions.filter(staff => service.staffIds.includes(staff.id));
        return (
          <button
            key={service.id}
            type="button"
            onClick={() => onOpenService(service)}
            className={`service-desk-row w-full text-left p-4 md:p-5 transition-colors bg-white text-black hover:bg-neutral-50 ${selectedId === service.id ? 'service-desk-row-active' : ''}`}
          >
            <div className="grid lg:grid-cols-[minmax(0,1.4fr),minmax(0,1fr),auto] gap-4 items-center">
              <div className="flex items-start gap-4 min-w-0">
                <div className="w-14 h-14 rounded-2xl overflow-hidden shrink-0 border border-neutral-100 bg-neutral-50">
                  {service.imageUrls?.[0] ? (
                    <img src={service.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Briefcase size={20} />
                    </div>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="font-black text-lg truncate">{service.name}</h3>
                    <span className={`rounded-full px-2 py-1 text-[9px] font-black uppercase tracking-[0.14em] ${service.active !== false ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-neutral-100 text-neutral-500 border border-neutral-100'}`}>
                      {service.active !== false ? 'Live' : 'Hidden'}
                    </span>
                  </div>
                  <p className="text-sm mt-1 line-clamp-2 text-neutral-500">{service.description || 'No description yet.'}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {service.category && <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] bg-neutral-100 text-neutral-500">{service.category}</span>}
                {formatServiceDuration(service.duration) && <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] bg-neutral-100 text-neutral-500">{formatServiceDuration(service.duration)}</span>}
                {formatServicePrice(service) && <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] bg-neutral-100 text-neutral-500">{formatServicePrice(service)}</span>}
                {assignedStaff.length > 0 ? (
                  <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] bg-neutral-100 text-neutral-500">{assignedStaff.length} staff</span>
                ) : (
                  <span className="rounded-full px-3 py-1 text-[9px] font-black uppercase tracking-[0.14em] bg-amber-50 text-amber-700 border border-amber-100">No staff</span>
                )}
              </div>

              <div className="justify-self-start lg:justify-self-end">
                <span className="h-10 px-4 rounded-lg border border-neutral-200 bg-white text-black text-[10px] font-black uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2">
                  <Edit3 size={13} /> Open File
                </span>
              </div>
            </div>
          </button>
        );
      })}
    </div>
  );
}
