import { Button } from '../../../shared/ui/Button';
import { useEffect, useMemo, useRef, useState } from 'react';
import { CatalogToolbar } from '../../../shared/ui/CatalogToolbar';
import { filterManagedCatalog } from '../../../utils/catalogSearch';
import { Plus } from 'lucide-react';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { navigate, workspacePagePath } from '../../../app/routing';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import {
  collectServiceCategories,
  createServiceId,
  normalizeService
} from '../../../utils/services';
import { ServiceCatalogCard } from '../components/ServiceCatalogCard';
import { ServiceEditorSheet } from '../components/ServiceEditorSheet';
import { ServiceInfoSheet } from '../components/ServiceInfoSheet';
import { getServiceBookingFormat } from '../../../../functions/serviceTemplates';

const emptyDraft = () => ({
  id: '',
  name: '',
  price: '',
  cost: '',
  duration: '60',
  fixedDuration: true,
  minDuration: '',
  scheduleType: 'appointment',
  bookingFormat: '',
  description: '',
  category: '',
  exploreMainCategoryId: '',
  exploreSubcategoryId: '',
  catalogTemplateId: '',
  serviceDetails: {},
  serviceSpecFields: [],
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
    ...service,
    bookingFormat: getServiceBookingFormat(service),
    id: service.id,
    name: service.name || '',
    price: String(service.price ?? ''),
    cost: String(service.cost ?? ''),
    duration: String(service.duration ?? '60'),
    fixedDuration: service.fixedDuration !== false,
    minDuration: String(service.minDuration ?? ''),
    scheduleType: service.scheduleType || 'appointment',
    description: service.description || '',
    category: service.category || '',
    exploreMainCategoryId: service.exploreMainCategoryId || '',
    exploreSubcategoryId: service.exploreSubcategoryId || '',
    catalogTemplateId: service.catalogTemplateId || '',
    serviceDetails: { ...(service.serviceDetails || {}) },
    serviceSpecFields: [...(service.serviceSpecFields || [])],
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
          cost: String(variant.cost ?? ''),
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

function decodeItemId(value = '') {
  try { return decodeURIComponent(value); } catch { return value; }
}

export function ServicesPage({ routeRest = [] }) {
  const {
    services = [],
    staff = [],
    workspace,
    ownerWorkspaceReady = true,
    upsertService,
    removeService,
    setServiceCategories
  } = useWorkspace();
  const isMobile = useIsMobileEditor();
  const servicesPath = workspacePagePath('services');
  const [draftOpen, setDraftOpen] = useState(false);
  const [draft, setDraft] = useState(emptyDraft);
  const [query, setQuery] = useState('');
  const [catalogStatus, setCatalogStatus] = useState('all');
  const openedEditorRoute = useRef('');
  const visibleServices = useMemo(() => filterManagedCatalog(services, query, catalogStatus), [services, query, catalogStatus]);

  const mode = routeRest[0] || '';
  const editId = decodeItemId(routeRest[1] || '');
  const editorRoute = mode === 'new' || (mode === 'edit' && Boolean(editId));
  const pageMode = isMobile && editorRoute;
  const pageView = mode === 'view';
  const viewService = pageView ? services.find((item) => item.id === editId) : null;

  const categories = useMemo(
    () =>
      collectServiceCategories(services, workspace.serviceCategories || []),
    [services, workspace.serviceCategories]
  );

  useEffect(() => {
    if (!ownerWorkspaceReady) return;
    if (!editorRoute) {
      openedEditorRoute.current = '';
      setDraftOpen(false);
      return;
    }
    const routeKey = `${mode}/${editId}`;
    if (openedEditorRoute.current === routeKey) return;
    if (mode === 'new') {
      openedEditorRoute.current = routeKey;
      setDraft(emptyDraft());
      setDraftOpen(true);
      return;
    }
    if (mode === 'edit' && editId) {
      const existing = services.find((item) => item.id === editId);
      if (existing) {
        openedEditorRoute.current = routeKey;
        setDraft(toDraft(existing));
        setDraftOpen(true);
      } else {
        navigate(servicesPath, { replace: true });
      }
    }
  }, [editorRoute, mode, editId, services, servicesPath, ownerWorkspaceReady]);

  const openCreate = () => {
    navigate(`${servicesPath}/new`);
  };

  const openEdit = (service) => {
    navigate(`${servicesPath}/edit/${encodeURIComponent(service.id)}`);
  };

  const openView = (service) => navigate(`${servicesPath}/view/${encodeURIComponent(service.id)}`);
  const closeView = () => navigate(servicesPath);

  const closeDraft = () => {
    setDraftOpen(false);
    setDraft(emptyDraft());
    if (editorRoute) navigate(servicesPath);
  };

  const saveDraft = async () => {
    const fixedDuration = draft.fixedDuration !== false;
    const { bookingFormat, ...serviceDraft } = draft;
    await upsertService(
      normalizeService({
        ...serviceDraft,
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

  if ((pageView || editorRoute) && !ownerWorkspaceReady) {
    return <div className="bb-services-desk bb-managed-catalog" role="status">Loading service details…</div>;
  }

  if (pageView && viewService) {
    return <ServiceInfoSheet key={viewService.id} service={viewService} staff={staff} onClose={closeView} onEdit={openEdit} variant="page" />;
  }

  if (pageView) {
    return <div className="bb-services-desk bb-managed-catalog"><div className="bb-page-title-wrap"><PageBackButton ariaLabel="Back to Services" onClick={closeView} /><h1 className="bb-page-title">Service unavailable</h1></div><p>This service may have been removed.</p><Button variant="secondary" type="button" onClick={closeView}>Back to Services</Button></div>;
  }

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
    <div className="bb-services-desk bb-managed-catalog">
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
        <Button action="add" variant="primary" type="button" className="bb-page-action" onClick={openCreate}>
          <Plus size={14} strokeWidth={2.35} aria-hidden="true" />
          Add service
        </Button>
      </header>

      <CatalogToolbar query={query} onQueryChange={setQuery} status={catalogStatus} onStatusChange={setCatalogStatus} count={visibleServices.length} total={services.length} noun="services" />
      {services.length === 0 ? (
        <div className="bb-services-catalog-empty">
          No services yet. Add your first offering.
        </div>
      ) : visibleServices.length === 0 ? <div className="bb-services-catalog-empty"><strong>No matching services</strong><p>Try a different name, category or status.</p><Button action="clear" variant="secondary" className="bb-btn" type="button" onClick={() => { setQuery(''); setCatalogStatus('all'); }}>Clear filters</Button></div> : (
        <div className="bb-managed-catalog-list">
          {visibleServices.map((service) => (
            <ServiceCatalogCard
              key={service.id}
              service={service}
              onView={openView}
              bookings={workspace.bookings || []}
              onEdit={openEdit}
              onRemove={(item) => removeService(item.id)}
            />
          ))}
        </div>
      )}

      {!isMobile ? (
        <ServiceEditorSheet
          open={editorRoute && draftOpen}
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
