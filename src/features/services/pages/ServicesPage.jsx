import { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { navigate } from '../../../app/routing';
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
  exploreMainCategoryId: '',
  exploreSubcategoryId: '',
  capacity: '1',
  sessionStartDate: '',
  sessionStartTime: '10:00',
  sessionEndDate: '',
  sessionEndTime: '12:00',
  staffIds: [],
  image: '',
  active: true,
  variants: []
});

function toDraft(service) {
  return {
    id: service.id,
    name: service.name || '',
    price: String(service.price ?? ''),
    duration: String(service.duration ?? '60'),
    fixedDuration: service.fixedDuration !== false,
    minDuration: String(service.minDuration ?? ''),
    scheduleType: service.scheduleType || 'appointment',
    description: service.description || '',
    category: service.category || '',
    exploreMainCategoryId: service.exploreMainCategoryId || '',
    exploreSubcategoryId: service.exploreSubcategoryId || '',
    capacity: String(service.capacity || 1),
    sessionStartDate: service.sessionStartDate || '',
    sessionStartTime: service.sessionStartTime || '10:00',
    sessionEndDate: service.sessionEndDate || service.sessionStartDate || '',
    sessionEndTime: service.sessionEndTime || '12:00',
    staffIds: service.staffIds || [],
    image: service.imageUrls?.[0] || '',
    active: service.active !== false,
    variants: Array.isArray(service.variants)
      ? service.variants.map((variant) => ({
          id: variant.id,
          name: variant.name || '',
          description: variant.description || '',
          price: String(variant.price ?? ''),
          minDuration: String(variant.minDuration ?? ''),
          available: variant.available !== false
        }))
      : []
  };
}

function useIsMobileEditor() {
  const [mobile, setMobile] = useState(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(max-width: 899px)').matches
      : false
  );
  useEffect(() => {
    const mq = window.matchMedia('(max-width: 899px)');
    const onChange = () => setMobile(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);
  return mobile;
}

export function ServicesPage({ routeRest = [] }) {
  const {
    services,
    staff,
    workspace,
    upsertService,
    removeService,
    setServiceCategories
  } = useWorkspace();
  const isMobile = useIsMobileEditor();
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);

  const mode = routeRest[0] || '';
  const editId = routeRest[1] || '';
  const pageMode =
    isMobile && (mode === 'new' || (mode === 'edit' && Boolean(editId)));

  const categories = useMemo(
    () =>
      collectServiceCategories(services, workspace.serviceCategories || []),
    [services, workspace.serviceCategories]
  );

  useEffect(() => {
    if (!pageMode) return;
    if (mode === 'new') {
      setDraft(emptyDraft());
      setDraftOpen(true);
      return;
    }
    if (mode === 'edit' && editId) {
      const existing = services.find((item) => item.id === editId);
      if (existing) {
        setDraft(toDraft(existing));
        setDraftOpen(true);
      } else {
        navigate('/dashboard/services');
      }
    }
  }, [pageMode, mode, editId, services]);

  const openCreate = () => {
    if (isMobile) {
      navigate('/dashboard/services/new');
      return;
    }
    setDraft(emptyDraft());
    setDraftOpen(true);
  };

  const openEdit = (service) => {
    if (isMobile) {
      navigate(`/dashboard/services/edit/${service.id}`);
      return;
    }
    setDraft(toDraft(service));
    setDraftOpen(true);
  };

  const closeDraft = () => {
    setDraftOpen(false);
    setDraft(emptyDraft());
    if (pageMode) navigate('/dashboard/services');
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

  if (pageMode && draftOpen) {
    return (
      <ServiceEditorSheet
        open
        variant="page"
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
    );
  }

  return (
    <div className="bb-services-desk">
      <header className="bb-services-desk-header">
        <div className="bb-services-desk-copy">
          <div className="bb-page-title-wrap">
            <PageBackButton />
            <span className="bb-page-title-main">
              <div className="bb-page-header-glow" aria-hidden="true" />
              <h1 className="bb-page-title bb-services-desk-title">Services</h1>
            </span>
          </div>
        </div>
        <button type="button" className="bb-page-action" onClick={openCreate}>
          <Plus size={14} strokeWidth={2.35} aria-hidden="true" />
          Add service
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
              bookings={workspace.bookings || []}
              onEdit={openEdit}
              onRemove={(item) => removeService(item.id)}
            />
          ))}
        </div>
      )}

      {!isMobile ? (
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
      ) : null}
    </div>
  );
}
