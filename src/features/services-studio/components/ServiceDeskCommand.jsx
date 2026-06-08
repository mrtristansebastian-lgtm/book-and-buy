import { Plus, Search, Tag, Users } from 'lucide-react';
import { getStaffInitial, serviceStatusFilters } from '../servicesStudioModel';

export function ServiceDeskCommand({
  query,
  onQueryChange,
  onCreateService,
  canManageWorkspace,
  services,
  statusFilter,
  onStatusFilterChange,
  categoryOptions,
  categoryFilter,
  onCategoryFilterChange,
  staffOptions,
  staffFilter,
  onStaffFilterChange
}) {
  return (
    <div className="service-desk-command">
      <div className="flex flex-col xl:flex-row gap-3">
        <label className="service-search-field native-control-pill h-12 rounded-xl bg-neutral-50 border border-neutral-200 px-4 flex items-center gap-2 flex-1 min-w-0">
          <Search size={16} className="text-neutral-400 shrink-0" />
          <input
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="Search service, category, price, note"
            className="native-control-input bg-transparent outline-none text-sm font-bold text-black placeholder:text-neutral-400 min-w-0 flex-1"
          />
        </label>
        <button
          type="button"
          onClick={onCreateService}
          disabled={!canManageWorkspace}
          className="native-gradient-button h-12 px-5 rounded-xl text-black text-[10px] font-black uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2 shadow-xl shadow-black/10 transition-transform hover:-translate-y-0.5 disabled:opacity-50 disabled:hover:translate-y-0"
        >
          <Plus size={14} /> New Service
        </button>
      </div>

      <div className="service-filter-rail flex flex-wrap items-center gap-2">
        {serviceStatusFilters.map(filter => {
          const active = statusFilter === filter.id;
          const FilterIcon = filter.icon;
          const count = filter.id === 'all'
            ? services.length
            : filter.id === 'live'
              ? services.filter(service => service.active !== false).length
              : services.filter(service => service.active === false).length;
          return (
            <button
              key={filter.id}
              type="button"
              onClick={() => onStatusFilterChange(filter.id)}
              className={`service-filter-tab h-10 px-3 rounded-lg text-[10px] font-black uppercase transition-all inline-flex items-center gap-2 ${active ? 'is-active bg-black text-white shadow-lg shadow-black/10' : 'bg-neutral-50 text-neutral-500 hover:bg-neutral-100 hover:text-black'}`}
            >
              <FilterIcon size={13} />
              {filter.label}
              <span className={`service-filter-count min-w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${active ? 'native-gradient-icon text-black' : 'bg-white text-black border border-neutral-100'}`}>{count}</span>
            </button>
          );
        })}
      </div>

      <div className="service-scope-grid">
        <div className="service-scope-panel">
          <div className="flex items-center gap-2 mb-2">
            <Tag size={14} />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">Categories</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onCategoryFilterChange('all')}
              className={`service-option-chip h-9 px-3 rounded-full text-[10px] font-black uppercase tracking-[0.12em] ${categoryFilter === 'all' ? 'is-active bg-black text-white' : 'bg-white text-neutral-500 border border-neutral-100'}`}
            >
              All
            </button>
            {categoryOptions.map(category => (
              <button
                key={category}
                type="button"
                onClick={() => onCategoryFilterChange(category)}
                className={`service-option-chip h-9 px-3 rounded-full text-[10px] font-black uppercase tracking-[0.12em] ${categoryFilter === category ? 'is-active bg-black text-white' : 'bg-white text-neutral-500 border border-neutral-100'}`}
              >
                {category}
              </button>
            ))}
            {categoryOptions.length === 0 && (
              <span className="h-9 px-3 rounded-full bg-white border border-dashed border-neutral-200 inline-flex items-center text-[10px] font-black uppercase tracking-[0.12em] text-neutral-400">
                Add categories from a service file
              </span>
            )}
          </div>
        </div>

        <div className="service-scope-panel">
          <div className="flex items-center gap-2 mb-2">
            <Users size={14} />
            <p className="text-[10px] font-black uppercase tracking-[0.16em] text-neutral-400">Staff</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => onStaffFilterChange('all')}
              className={`service-option-chip h-9 px-3 rounded-full text-[10px] font-black uppercase tracking-[0.12em] ${staffFilter === 'all' ? 'is-active bg-black text-white' : 'bg-white text-neutral-500 border border-neutral-100'}`}
            >
              All staff
            </button>
            <button
              type="button"
              onClick={() => onStaffFilterChange('unassigned')}
              className={`service-option-chip h-9 px-3 rounded-full text-[10px] font-black uppercase tracking-[0.12em] ${staffFilter === 'unassigned' ? 'is-active bg-black text-white' : 'bg-white text-neutral-500 border border-neutral-100'}`}
            >
              Unassigned
            </button>
            {staffOptions.map(staff => (
              <button
                key={staff.id}
                type="button"
                onClick={() => onStaffFilterChange(staff.id)}
                className={`service-option-chip h-9 pl-1.5 pr-3 rounded-full text-[10px] font-black uppercase tracking-[0.12em] inline-flex items-center gap-2 ${staffFilter === staff.id ? 'is-active bg-black text-white' : 'bg-white text-neutral-500 border border-neutral-100'}`}
              >
                <span
                  className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-black"
                  style={{ background: `${staff.color || '#755CFF'}22`, color: staff.color || '#755CFF' }}
                >
                  {getStaffInitial(staff)}
                </span>
                {staff.name || 'Staff'}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
