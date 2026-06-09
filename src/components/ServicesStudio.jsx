import { useMemo, useState } from 'react';
import { normalizeService, normalizeServiceList } from '../utils/services';
import {
  ServiceDeskCommand,
  ServiceDeskList,
  ServiceFileModal,
  blankService,
  filterServices,
  getCategoryOptions,
  normalizeServiceDurationValue
} from '../features/services-studio';

export const ServicesStudio = ({
  settings,
  staffList = [],
  onUpdateSettings,
  onImageUpload,
  onImageDelete,
  canManageWorkspace = true,
  showToast
}) => {
  const services = useMemo(() => normalizeServiceList(settings?.services || []), [settings?.services]);
  const staffOptions = useMemo(
    () => staffList.length ? staffList : [{ id: 'owner', name: 'Owner', color: '#755CFF' }],
    [staffList]
  );
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [staffFilter, setStaffFilter] = useState('all');
  const [selectedId, setSelectedId] = useState('');
  const [draft, setDraft] = useState(() => blankService());
  const [galleryInput, setGalleryInput] = useState('');
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);

  const categoryOptions = useMemo(() => getCategoryOptions(services), [services]);
  const filteredServices = useMemo(() => filterServices({
    services,
    query,
    statusFilter,
    categoryFilter,
    staffFilter
  }), [categoryFilter, query, services, staffFilter, statusFilter]);

  const saveSettings = async (nextServices, message = 'Services saved.') => {
    const nextSettings = {
      ...settings,
      services: normalizeServiceList(nextServices)
    };
    const saved = await onUpdateSettings?.(nextSettings, message);
    return saved !== false;
  };

  const openCreateService = () => {
    const nextService = blankService({
      category: categoryFilter !== 'all' ? categoryFilter : '',
      staffIds: staffFilter !== 'all' && staffFilter !== 'unassigned' ? [staffFilter] : []
    });
    setSelectedId(nextService.id);
    setDraft(nextService);
    setGalleryInput('');
    setIsServiceModalOpen(true);
  };

  const openServiceFile = (service) => {
    const normalized = normalizeService(service);
    setSelectedId(normalized.id);
    setDraft(normalized);
    setGalleryInput('');
    setIsServiceModalOpen(true);
  };

  const closeServiceModal = () => {
    setIsServiceModalOpen(false);
    setGalleryInput('');
  };

  const saveDraft = async () => {
    const cleaned = normalizeService(draft);
    if (!cleaned.name.trim()) {
      showToast?.('Give this service a name first.');
      return;
    }
    if (!normalizeServiceDurationValue(cleaned.duration)) {
      showToast?.('Choose a real service duration.');
      return;
    }
    const exists = services.some(service => service.id === cleaned.id);
    const nextServices = exists
      ? services.map(service => service.id === cleaned.id ? cleaned : service)
      : [cleaned, ...services];
    setSelectedId(cleaned.id);
    const saved = await saveSettings(nextServices, `${cleaned.name} saved.`);
    if (saved) closeServiceModal();
  };

  const removeDraft = async () => {
    if (!draft?.id) return;
    const nextServices = services.filter(service => service.id !== draft.id);
    setSelectedId('');
    setDraft(blankService());
    const saved = await saveSettings(nextServices, 'Service removed.');
    if (saved) closeServiceModal();
  };

  const updateDraft = (key, value) => setDraft(prev => ({
    ...prev,
    [key]: key === 'duration' ? normalizeServiceDurationValue(value) : value
  }));

  const toggleStaff = (staffId) => {
    setDraft(prev => {
      const current = Array.isArray(prev.staffIds) ? prev.staffIds : [];
      return {
        ...prev,
        staffIds: current.includes(staffId)
          ? current.filter(id => id !== staffId)
          : [...current, staffId]
      };
    });
  };

  const addGalleryUrl = () => {
    const url = galleryInput.trim();
    if (!url) return;
    setDraft(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), url] }));
    setGalleryInput('');
  };

  const handleGalleryUpload = (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (!files.length) return;
    if (onImageUpload) {
      files.forEach((file, index) => {
        onImageUpload(file, {
          folder: 'services',
          title: files.length > 1 ? `Crop service image ${index + 1}` : 'Crop service image',
          ratioKey: 'gallery'
        }, (url) => {
          setDraft(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), url] }));
        });
      });
      event.target.value = '';
      return;
    }
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = () => {
        setDraft(prev => ({ ...prev, imageUrls: [...(prev.imageUrls || []), String(reader.result || '')] }));
      };
      reader.readAsDataURL(file);
    });
    event.target.value = '';
  };

  const removeGalleryImage = (index) => {
    const url = (draft.imageUrls || [])[index];
    onImageDelete?.(url);
    setDraft(prev => ({
      ...prev,
      imageUrls: (prev.imageUrls || []).filter((_, itemIndex) => itemIndex !== index)
    }));
  };

  const selectedServiceExists = services.some(service => service.id === draft.id);

  return (
    <div className="services-studio">
      <section className="service-desk-shell">
        <ServiceDeskCommand
          query={query}
          onQueryChange={setQuery}
          onCreateService={openCreateService}
          canManageWorkspace={canManageWorkspace}
          services={services}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          categoryOptions={categoryOptions}
          categoryFilter={categoryFilter}
          onCategoryFilterChange={setCategoryFilter}
          staffOptions={staffOptions}
          staffFilter={staffFilter}
          onStaffFilterChange={setStaffFilter}
        />
        <ServiceDeskList
          filteredServices={filteredServices}
          services={services}
          staffOptions={staffOptions}
          selectedId={selectedId}
          onCreateService={openCreateService}
          onOpenService={openServiceFile}
          canManageWorkspace={canManageWorkspace}
        />
      </section>

      <ServiceFileModal
        isOpen={isServiceModalOpen}
        draft={draft}
        selectedServiceExists={selectedServiceExists}
        staffOptions={staffOptions}
        galleryInput={galleryInput}
        onGalleryInputChange={setGalleryInput}
        canManageWorkspace={canManageWorkspace}
        onClose={closeServiceModal}
        onRemove={removeDraft}
        onSave={saveDraft}
        onUpdateDraft={updateDraft}
        onToggleStaff={toggleStaff}
        onGalleryUpload={handleGalleryUpload}
        onRemoveGalleryImage={removeGalleryImage}
        onAddGalleryUrl={addGalleryUrl}
      />
    </div>
  );
};
