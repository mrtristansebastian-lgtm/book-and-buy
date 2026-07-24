import { Briefcase, CheckCircle2, Edit3, ImagePlus, Plus, SlidersHorizontal } from 'lucide-react';
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
        <div className="launch-empty-state service-empty-state">
          <div className="launch-empty-icon native-gradient-icon">
            <Briefcase size={23} />
          </div>
          <p className="launch-empty-eyebrow">{services.length ? 'Filtered services' : 'Service catalog'}</p>
          <h3>{services.length ? 'No matching services' : 'Build your first service'}</h3>
          <p className="launch-empty-copy">
            {services.length
              ? 'Adjust the search, category, staff member, or visibility filter to bring services back into view.'
              : 'Each business builds its own services from scratch. Add the name, price, duration, photos, location, staff, and booking rules exactly how you sell it.'}
          </p>
          {!services.length && (
            <div className="launch-empty-steps" aria-label="Service setup steps">
              <span><SlidersHorizontal size={14} /> Set price and duration</span>
              <span><ImagePlus size={14} /> Add photos</span>
              <span><CheckCircle2 size={14} /> Publish when ready</span>
            </div>
          )}
          <button
            type="button"
            onClick={onCreateService}
            disabled={!canManageWorkspace}
            className="launch-empty-primary disabled:opacity-50"
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
