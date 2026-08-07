import { useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  collectServiceCategories,
  createServiceId,
  normalizeService
} from '../../../utils/services';
import { ServiceCatalogCard } from '../components/ServiceCatalogCard';
import { ServiceEditorSheet } from '../components/ServiceEditorSheet';

const emptyDraft = () => ({
  id: '',
  name: '',
  price: '',
  duration: '60',
  fixedDuration: true,
  minDuration: '',
  scheduleType: 'appointment',
  description: '',
  category: '',
  capacity: '1',
  staffIds: [],
  image: '',
  active: true
});

export function ServicesPage() {
  const {
    services,
    staff,
    workspace,
    upsertService,
    removeService,
    setServiceCategories
  } = useWorkspace();
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const categories = useMemo(
    () =>
      collectServiceCategories(services, workspace.serviceCategories || []),
    [services, workspace.serviceCategories]
  );

  const openCreate = () => {
    setDraft(emptyDraft());
    setDraftOpen(true);
  };

  const openEdit = (service) => {
    setDraft({
      id: service.id,
      name: service.name || '',
      price: String(service.price ?? ''),
      duration: String(service.duration ?? '60'),
      fixedDuration: service.fixedDuration !== false,
      minDuration: String(service.minDuration ?? ''),
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

  const closeDraft = () => {
    setDraftOpen(false);
    setDraft(emptyDraft());
  };

  const saveDraft = () => {
    const fixedDuration = draft.fixedDuration !== false;
    upsertService(
      normalizeService({
        ...draft,
        id: draft.id || createServiceId(),
        fixedDuration,
        duration: fixedDuration ? draft.duration : draft.duration || draft.minDuration,
        minDuration: fixedDuration ? draft.minDuration || '' : draft.minDuration,
        capacity: Number(draft.capacity) || 1,
        imageUrls: draft.image ? [draft.image] : []
      })
    );
    closeDraft();
  };

  const addCategory = (label) => {
    const next = String(label || '').trim();
    if (!next) return;
    const merged = collectServiceCategories(services, [
      ...(workspace.serviceCategories || []),
      next
    ]);
    setServiceCategories?.(merged);
  };

  return (
    <div className="bb-services-desk">
      <header className="bb-services-desk-header">
        <div className="bb-services-desk-copy">
          <p className="bb-services-desk-eyebrow">Book</p>
          <h1 className="bb-services-desk-title">Services</h1>
          <p className="bb-services-desk-lede">
            Your Book catalog — same card language clients see on the public site.
          </p>
        </div>
        <button type="button" className="bb-primary-btn" onClick={openCreate}>
          <Plus size={16} /> Add service
        </button>
      </header>

      {services.length === 0 ? (
        <div className="bb-services-catalog-empty">
          No services yet. Add your first offering.
        </div>
      ) : (
        <div className="bb-public-product-grid bb-services-catalog-grid">
          {services.map((service) => (
            <ServiceCatalogCard
              key={service.id}
              service={service}
              onEdit={openEdit}
              onRemove={(item) => removeService(item.id)}
            />
          ))}
        </div>
      )}

      <ServiceEditorSheet
        open={draftOpen}
        draft={draft}
        onChange={setDraft}
        onClose={closeDraft}
        onSave={saveDraft}
        onDelete={
          draft.id
            ? () => {
                removeService(draft.id);
                closeDraft();
              }
            : undefined
        }
        staff={staff}
        categories={categories}
        onAddCategory={addCategory}
      />
    </div>
  );
}
