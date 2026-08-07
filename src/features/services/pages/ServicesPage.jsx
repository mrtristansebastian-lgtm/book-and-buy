import { useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  createServiceId,
  formatServiceDuration,
  formatServicePrice,
  normalizeService
} from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

const emptyDraft = () => ({
  id: '',
  name: '',
  price: '',
  duration: '60',
  scheduleType: 'appointment',
  description: '',
  category: '',
  capacity: '1',
  staffIds: [],
  image: '',
  active: true
});

export function ServicesPage() {
  const { services, staff, upsertService, removeService } = useWorkspace();
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const openCreate = () => {
    setDraft(emptyDraft());
    setDraftOpen(true);
  };

  const openEdit = (service) => {
    setDraft({
      id: service.id,
      name: service.name || '',
      price: String(service.price ?? ''),
      duration: String(service.duration ?? ''),
      scheduleType: service.scheduleType || 'appointment',
      description: service.description || '',
      category: service.category || '',
      capacity: String(service.capacity || 1),
      staffIds: service.staffIds || [],
      image: service.imageUrls?.[0] || '',
      active: service.active !== false
    });
    setDraftOpen(true);
  };

  const saveDraft = () => {
    if (!draft.name.trim()) return;
    upsertService(
      normalizeService({
        ...draft,
        id: draft.id || createServiceId(),
        capacity: Number(draft.capacity) || 1,
        imageUrls: draft.image ? [draft.image] : []
      })
    );
    setDraftOpen(false);
    setDraft(emptyDraft());
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Services</h1>
          <p className="bb-muted m-0">Your Book catalog.</p>
        </div>
        <button type="button" className="bb-primary-btn" onClick={openCreate}>
          <Plus size={16} /> Add service
        </button>
      </header>

      <section className="grid gap-3">
        {services.length === 0 ? (
          <div className="bb-panel p-6 bb-muted">No services yet. Add your first offering.</div>
        ) : (
          services.map((service) => {
            const meta = getScheduleTypeMeta(service.scheduleType);
            return (
              <article
                key={service.id}
                className="bb-panel p-4 md:p-5 grid md:grid-cols-[120px_1fr_auto] gap-4 items-center"
              >
                <div className="h-24 rounded-xl overflow-hidden bg-black/5">
                  {service.imageUrls?.[0] ? (
                    <img src={service.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                  ) : null}
                </div>
                <div className="grid gap-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="bb-page-title text-xl m-0">{service.name}</h2>
                    <span className="text-xs font-semibold uppercase tracking-wide text-black/40">
                      {meta.singular}
                    </span>
                    {service.active === false ? (
                      <span className="text-xs font-semibold text-black/35">Hidden</span>
                    ) : null}
                  </div>
                  <p className="bb-muted m-0 text-sm line-clamp-2">{service.description}</p>
                  <p className="m-0 text-sm font-semibold text-ink">
                    {[
                      formatServicePrice(service),
                      formatServiceDuration(service.duration),
                      service.category
                    ]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="bb-ghost-btn" onClick={() => openEdit(service)}>
                    <Pencil size={15} /> Edit
                  </button>
                  <button
                    type="button"
                    className="bb-ghost-btn"
                    onClick={() => removeService(service.id)}
                  >
                    Remove
                  </button>
                </div>
              </article>
            );
          })
        )}
      </section>

      {draftOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4">
          <div className="bb-panel w-full max-w-lg p-5 grid gap-3 max-h-[90vh] overflow-auto">
            <h2 className="bb-page-title text-2xl m-0">{draft.id ? 'Edit service' : 'New service'}</h2>
            <input
              className="native-control-input px-4"
              placeholder="Service name"
              value={draft.name}
              onChange={(event) => setDraft((prev) => ({ ...prev, name: event.target.value }))}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                className="native-control-input px-4"
                placeholder="Price"
                value={draft.price}
                onChange={(event) => setDraft((prev) => ({ ...prev, price: event.target.value }))}
              />
              <input
                className="native-control-input px-4"
                placeholder="Duration (min)"
                value={draft.duration}
                onChange={(event) => setDraft((prev) => ({ ...prev, duration: event.target.value }))}
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <select
                value={draft.scheduleType}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, scheduleType: event.target.value }))
                }
              >
                <option value="appointment">Appointment</option>
                <option value="class_session">Spot / class</option>
              </select>
              <input
                className="native-control-input px-4"
                placeholder="Capacity"
                value={draft.capacity}
                onChange={(event) => setDraft((prev) => ({ ...prev, capacity: event.target.value }))}
              />
            </div>
            <input
              className="native-control-input px-4"
              placeholder="Category"
              value={draft.category}
              onChange={(event) => setDraft((prev) => ({ ...prev, category: event.target.value }))}
            />
            <input
              className="native-control-input px-4"
              placeholder="Image URL"
              value={draft.image}
              onChange={(event) => setDraft((prev) => ({ ...prev, image: event.target.value }))}
            />
            <div className="grid gap-2">
              <span className="text-sm font-semibold">Assigned staff</span>
              <div className="flex flex-wrap gap-2">
                {staff.map((member) => {
                  const on = draft.staffIds.includes(member.id);
                  return (
                    <button
                      key={member.id}
                      type="button"
                      className={on ? 'bb-primary-btn py-1.5 px-3 text-sm' : 'bb-ghost-btn py-1.5 px-3 text-sm'}
                      onClick={() =>
                        setDraft((prev) => ({
                          ...prev,
                          staffIds: on
                            ? prev.staffIds.filter((id) => id !== member.id)
                            : [...prev.staffIds, member.id]
                        }))
                      }
                    >
                      {member.name}
                    </button>
                  );
                })}
              </div>
            </div>
            <textarea
              className="native-control-input px-4 py-3"
              rows={3}
              placeholder="Description"
              value={draft.description}
              onChange={(event) =>
                setDraft((prev) => ({ ...prev, description: event.target.value }))
              }
            />
            <label className="flex items-center gap-2 text-sm font-semibold">
              <input
                type="checkbox"
                checked={draft.active}
                onChange={(event) =>
                  setDraft((prev) => ({ ...prev, active: event.target.checked }))
                }
              />
              Visible on public Book page
            </label>
            <div className="flex gap-2 justify-end">
              <button type="button" className="bb-ghost-btn" onClick={() => setDraftOpen(false)}>
                Cancel
              </button>
              <button type="button" className="bb-primary-btn" onClick={saveDraft}>
                Save service
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
