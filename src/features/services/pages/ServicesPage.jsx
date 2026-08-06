import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { BookingRequestsDesk } from '../../bookings/components/BookingRequestsDesk';
import { ManualBookingSheet } from '../../bookings/components/ManualBookingSheet';
import { formatServiceDuration, formatServicePrice, createServiceId } from '../../../utils/services';
import { getScheduleTypeMeta } from '../../../utils/scheduleTypes';

export function ServicesPage() {
  const { services, bookings, upsertService, removeService } = useWorkspace();
  const [mode, setMode] = useState('catalog');
  const [manualOpen, setManualOpen] = useState(false);
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState({
    name: '',
    price: '',
    duration: '60',
    scheduleType: 'appointment',
    description: ''
  });

  const pendingCount = useMemo(
    () => bookings.filter((booking) => ['pending', 'waitlist'].includes(booking.status)).length,
    [bookings]
  );

  const saveDraft = () => {
    if (!draft.name.trim()) return;
    upsertService({
      id: createServiceId(),
      ...draft,
      price: draft.price,
      active: true
    });
    setDraft({ name: '', price: '', duration: '60', scheduleType: 'appointment', description: '' });
    setDraftOpen(false);
  };

  return (
    <div className="grid gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div className="grid gap-1">
          <h1 className="bb-page-title text-3xl m-0">Services</h1>
          <p className="bb-muted m-0">Catalog and booking requests in one place.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PeriodSegmentedControl
            ariaLabel="Services mode"
            value={mode}
            onChange={setMode}
            options={[
              { id: 'catalog', label: 'Catalog' },
              { id: 'requests', label: 'Requests', count: pendingCount }
            ]}
          />
          {mode === 'catalog' ? (
            <button type="button" className="bb-primary-btn" onClick={() => setDraftOpen(true)}>
              <Plus size={16} /> Add service
            </button>
          ) : (
            <button type="button" className="bb-ink-btn" onClick={() => setManualOpen(true)}>
              Manual booking
            </button>
          )}
        </div>
      </header>

      {mode === 'catalog' ? (
        <section className="grid gap-3">
          {services.map((service) => {
            const meta = getScheduleTypeMeta(service.scheduleType);
            return (
              <article key={service.id} className="bb-panel p-4 md:p-5 grid md:grid-cols-[120px_1fr_auto] gap-4 items-center">
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
                  </div>
                  <p className="bb-muted m-0 text-sm line-clamp-2">{service.description}</p>
                  <p className="m-0 text-sm font-semibold text-ink">
                    {[formatServicePrice(service), formatServiceDuration(service.duration)]
                      .filter(Boolean)
                      .join(' · ')}
                  </p>
                </div>
                <button
                  type="button"
                  className="bb-ghost-btn"
                  onClick={() => removeService(service.id)}
                >
                  Remove
                </button>
              </article>
            );
          })}
        </section>
      ) : (
        <BookingRequestsDesk />
      )}

      {draftOpen ? (
        <div className="fixed inset-0 z-40 bg-black/30 grid place-items-end md:place-items-center p-4">
          <div className="bb-panel w-full max-w-lg p-5 grid gap-3">
            <h2 className="bb-page-title text-2xl m-0">New service</h2>
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
            <select
              value={draft.scheduleType}
              onChange={(event) => setDraft((prev) => ({ ...prev, scheduleType: event.target.value }))}
            >
              <option value="appointment">Appointment</option>
              <option value="class_session">Spot / class</option>
            </select>
            <textarea
              className="native-control-input px-4 py-3"
              rows={3}
              placeholder="Description"
              value={draft.description}
              onChange={(event) => setDraft((prev) => ({ ...prev, description: event.target.value }))}
            />
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

      {manualOpen ? <ManualBookingSheet onClose={() => setManualOpen(false)} /> : null}
    </div>
  );
}
