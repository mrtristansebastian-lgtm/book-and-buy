import { Check, DollarSign, Image, Trash2, UserPlus, X } from 'lucide-react';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import {
  getStaffInitial,
  priceTypes,
  normalizeServiceDurationValue,
  serviceDurationOptions,
  serviceWorkflowPlacements
} from '../servicesStudioModel';

export function ServiceFileModal({
  isOpen,
  draft,
  selectedServiceExists,
  staffOptions,
  galleryInput,
  onGalleryInputChange,
  canManageWorkspace,
  onClose,
  onRemove,
  onSave,
  onUpdateDraft,
  onToggleStaff,
  onGalleryUpload,
  onRemoveGalleryImage,
  onAddGalleryUrl
}) {
  if (!isOpen) return null;

  const selectedDuration = normalizeServiceDurationValue(draft.duration);

  return (
    <div className="service-modal fixed inset-0 z-[150] bg-black/45 backdrop-blur-sm p-3 md:p-6 flex items-end md:items-center justify-center">
      <div className="service-modal-panel w-full max-w-6xl max-h-[92vh] rounded-[1.75rem] bg-white border border-white/80 shadow-2xl shadow-black/25 overflow-hidden flex flex-col">
        <div className="p-4 md:p-5 border-b border-neutral-100 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-neutral-400">Create Service</p>
            <h2 className="text-2xl md:text-3xl font-black tracking-tight text-black truncate">
              {selectedServiceExists ? draft.name || 'Edit service' : 'Create service'}
            </h2>
            <p className="text-sm text-neutral-500 mt-1 max-w-2xl">
              Set the service clients can book, who can deliver it, and what details carry into bookings and the calendar.
            </p>
          </div>
          <button type="button" onClick={onClose} className="w-11 h-11 rounded-full border border-neutral-200 bg-white text-black inline-flex items-center justify-center shrink-0" aria-label="Close service editor">
            <X size={18} />
          </button>
        </div>

        <div className="service-modal-body overflow-y-auto p-4 md:p-5 grid xl:grid-cols-[minmax(0,1.15fr),minmax(330px,0.85fr)] gap-5">
          <div className="space-y-4">
            <section className="rounded-2xl border border-neutral-200 p-4 md:p-5 bg-white">
              <div className="flex items-start justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Service Details</p>
                  <h3 className="text-xl font-black text-black mt-1">What clients book</h3>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateDraft('active', !draft.active)}
                  className={`h-10 px-4 rounded-full text-[10px] font-black uppercase tracking-[0.16em] ${draft.active ? 'bg-emerald-100 text-emerald-700' : 'bg-neutral-100 text-neutral-500'}`}
                >
                  {draft.active ? 'Live' : 'Hidden'}
                </button>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <label className="service-field sm:col-span-2">
                  <span>Name</span>
                  <input value={draft.name} onChange={(event) => onUpdateDraft('name', event.target.value)} placeholder="Service name" />
                </label>
                <label className="service-field sm:col-span-2">
                  <span>Category</span>
                  <input value={draft.category} onChange={(event) => onUpdateDraft('category', event.target.value)} placeholder="Cut, class, consult..." />
                </label>
                <div className="service-field service-duration-picker sm:col-span-2">
                  <span>Duration</span>
                  <div className="service-duration-grid" role="radiogroup" aria-label="Service duration">
                    {serviceDurationOptions.map(option => {
                      const value = String(option.minutes);
                      const active = selectedDuration === value;
                      return (
                        <button
                          key={value}
                          type="button"
                          role="radio"
                          aria-checked={active}
                          className={active ? 'is-active' : ''}
                          onClick={() => onUpdateDraft('duration', value)}
                        >
                          {option.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
                <label className="service-field sm:col-span-2">
                  <span>Description</span>
                  <textarea value={draft.description} onChange={(event) => onUpdateDraft('description', event.target.value)} placeholder="What is included, who it is for, and anything clients should know." rows={4} />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 p-4 md:p-5 bg-white">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Pricing</p>
                  <h3 className="text-xl font-black text-black mt-1">How this is charged</h3>
                </div>
                <DollarSign size={18} />
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
                {priceTypes.map(type => (
                  <button
                    key={type.id}
                    type="button"
                    onClick={() => onUpdateDraft('priceType', type.id)}
                    className={`h-10 rounded-xl text-[10px] font-black uppercase tracking-[0.12em] ${draft.priceType === type.id ? 'bg-black text-white' : 'bg-neutral-50 text-neutral-500 border border-neutral-100'}`}
                  >
                    {type.label}
                  </button>
                ))}
              </div>
              <div className="grid grid-cols-[78px,1fr] gap-3">
                <label className="service-field">
                  <span>Currency</span>
                  <input value={draft.currency} onChange={(event) => onUpdateDraft('currency', event.target.value)} />
                </label>
                <label className="service-field">
                  <span>Price</span>
                  <input value={draft.price} onChange={(event) => onUpdateDraft('price', event.target.value)} placeholder={draft.priceType === 'quote' ? 'Optional' : '450'} />
                </label>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 p-4 md:p-5 bg-white">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Assigned Staff</p>
                  <h3 className="text-xl font-black text-black mt-1">Who can deliver it</h3>
                </div>
                <UserPlus size={18} />
              </div>
              <div className="flex flex-wrap gap-2">
                {staffOptions.map(staff => {
                  const active = draft.staffIds?.includes(staff.id);
                  return (
                    <button
                      key={staff.id}
                      type="button"
                      onClick={() => onToggleStaff(staff.id)}
                      className={`rounded-full border px-3 py-2 text-xs font-black inline-flex items-center gap-2 ${active ? 'bg-black text-white border-black' : 'bg-white text-black border-neutral-200'}`}
                    >
                      <span
                        className="w-6 h-6 rounded-full inline-flex items-center justify-center text-[10px] font-black"
                        style={{ background: active ? '#ffffff22' : `${staff.color || '#755CFF'}22`, color: active ? '#fff' : staff.color || '#755CFF' }}
                      >
                        {getStaffInitial(staff)}
                      </span>
                      {staff.name || 'Staff'}
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 p-4 md:p-5 bg-white">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Gallery</p>
                  <h3 className="text-xl font-black text-black mt-1">Optional images</h3>
                </div>
                <Image size={18} />
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-2 mb-3">
                {(draft.imageUrls || []).slice(0, 8).map((url, index) => (
                  <div key={`${url}-${index}`} className="relative aspect-square rounded-xl overflow-hidden bg-neutral-100">
                    <img src={url} alt="" className="w-full h-full object-cover" />
                    <button type="button" onClick={() => onRemoveGalleryImage(index)} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black text-white inline-flex items-center justify-center">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                <label
                  className="service-gallery-upload aspect-square rounded-xl border border-dashed border-neutral-300 bg-neutral-50 flex items-center justify-center cursor-pointer"
                  aria-label="Upload service images"
                >
                  <span className="service-media-placeholder">
                    <span className="service-media-placeholder-icon" />
                    <span className="service-media-placeholder-action" />
                  </span>
                  <input type="file" accept="image/*" multiple className="service-gallery-upload-input" onChange={onGalleryUpload} aria-label="Upload service images" />
                </label>
              </div>
              <div className="flex gap-2">
                <input
                  value={galleryInput}
                  onChange={(event) => onGalleryInputChange(event.target.value)}
                  placeholder="Paste image URL"
                  className="min-w-0 flex-1 h-11 rounded-xl bg-neutral-50 border border-neutral-200 px-3 text-sm font-bold outline-none"
                />
                <button type="button" onClick={onAddGalleryUrl} className="h-11 px-4 rounded-xl bg-neutral-900 text-white text-xs font-black uppercase tracking-[0.14em]">Add</button>
              </div>
            </section>
          </div>

          <aside className="space-y-4 xl:sticky xl:top-0 self-start">
            <section className="rounded-2xl border border-neutral-200 p-4 md:p-5 bg-neutral-50">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400 mb-3">Booking Preview</p>
              <div className="rounded-2xl bg-white border border-neutral-100 p-4">
                <div className="flex items-start gap-3">
                  <div className={`w-12 h-12 rounded-xl inline-flex items-center justify-center shrink-0 ${draft.imageUrls?.[0] ? 'bg-black text-white overflow-hidden' : 'service-preview-media-cell'}`}>
                    {draft.imageUrls?.[0] ? (
                      <img src={draft.imageUrls[0]} alt="" className="w-full h-full object-cover rounded-xl" />
                    ) : (
                      <span className="service-media-placeholder is-compact">
                        <span className="service-media-placeholder-icon" />
                      </span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-black text-black">{draft.name || 'Service name'}</h3>
                    <p className="text-xs text-neutral-500 mt-1">{draft.description || 'Client-facing description will show here.'}</p>
                    <div className="service-preview-specs mt-3">
                      {formatServicePrice(draft) && (
                        <span className="service-preview-stat is-price">
                          <small>Price</small>
                          <strong>{formatServicePrice(draft)}</strong>
                        </span>
                      )}
                      {formatServiceDuration(draft.duration) && (
                        <span className="service-preview-stat">
                          <small>Duration</small>
                          <strong>{formatServiceDuration(draft.duration)}</strong>
                        </span>
                      )}
                      {draft.category && <span className="service-preview-category">{draft.category}</span>}
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-neutral-200 p-4 md:p-5 bg-white">
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-neutral-400">Workflow</p>
              <h3 className="text-xl font-black text-black mt-1">Where this service appears</h3>
              <div className="grid gap-2 mt-4">
                {serviceWorkflowPlacements.map(item => (
                  <div key={item} className="rounded-xl border border-neutral-100 bg-neutral-50 px-3 py-2 text-sm font-bold text-neutral-600 flex items-center gap-2">
                    <Check size={14} /> {item}
                  </div>
                ))}
              </div>
            </section>
          </aside>
        </div>

        <div className="p-4 md:p-5 border-t border-neutral-100 bg-white flex flex-col sm:flex-row gap-3 sm:justify-between">
          <button
            type="button"
            onClick={onRemove}
            disabled={!draft.id || !selectedServiceExists || !canManageWorkspace}
            className="h-12 px-5 rounded-full border border-red-100 bg-red-50 text-red-600 text-xs font-black uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2 disabled:opacity-40"
          >
            <Trash2 size={15} /> Remove
          </button>
          <div className="grid sm:grid-cols-2 gap-3 sm:min-w-[24rem]">
            <button
              type="button"
              onClick={onClose}
              className="h-12 rounded-full border border-neutral-200 bg-white text-black text-xs font-black uppercase tracking-[0.16em]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onSave}
              disabled={!canManageWorkspace}
              className="h-12 rounded-full bg-black text-white text-xs font-black uppercase tracking-[0.16em] inline-flex items-center justify-center gap-2 disabled:opacity-40"
            >
              <Check size={15} /> Save Service
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
