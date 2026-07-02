import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  Clock,
  DollarSign,
  Home,
  Image,
  MapPin,
  Sparkles,
  Trash2,
  Video,
  X
} from 'lucide-react';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import {
  getStaffInitial,
  priceTypes,
  normalizeServiceDurationValue,
  serviceDurationOptions
} from '../servicesStudioModel';

const wizardSteps = [
  { id: 'details', label: 'Details', title: 'Service details', helper: 'Name, description, category, and visibility.' },
  { id: 'pricing', label: 'Pricing', title: 'Pricing', helper: 'Choose how this service is charged, including price and tax.' },
  { id: 'availability', label: 'Duration', title: 'Service duration', helper: 'Choose a fixed duration, or let schedule availability decide the booking length.' },
  { id: 'photos', label: 'Photos', title: 'Service photos', helper: 'Add the images clients see on the booking page service card.' },
  { id: 'delivery', label: 'Staff', title: 'Assign staff members', helper: 'Choose which team members can take this appointment.' },
  { id: 'location', label: 'Location', title: 'Location', helper: 'Choose where the service happens and add travel or online details.' },
  { id: 'rules', label: 'Rules', title: 'Booking rules', helper: 'Control notice, payment, approval, cancellation, and repeat bookings.' },
  { id: 'preview', label: 'Preview', title: 'Booking page card', helper: 'See the exact service card style clients will see on the booking page.' }
];

const typeCopy = {
  appointment: {
    delivery: 'Assign staff members',
    deliveryHint: 'Choose who can take this appointment.'
  },
};

const locationOptions = [
  { id: 'business', label: 'At Business', icon: Home },
  { id: 'customer', label: 'Customer Location', icon: MapPin },
  { id: 'online', label: 'Online', icon: Video },
  { id: 'custom', label: 'Custom Location', icon: Briefcase }
];

const bufferOptions = [
  { value: '', label: 'No buffer' },
  { value: '5 min', label: '5 min' },
  { value: '10 min', label: '10 min' },
  { value: '15 min', label: '15 min' },
  { value: '30 min', label: '30 min' },
  { value: '45 min', label: '45 min' },
  { value: '1 hour', label: '1 hour' }
];

const bookingNoticeOptions = [
  { value: '', label: 'No minimum notice' },
  { value: '1 hour', label: '1 hour' },
  { value: '2 hours', label: '2 hours' },
  { value: '4 hours', label: '4 hours' },
  { value: '12 hours', label: '12 hours' },
  { value: '24 hours', label: '24 hours' },
  { value: '48 hours', label: '48 hours' },
  { value: '7 days', label: '7 days' }
];

const advanceBookingOptions = [
  { value: '', label: 'No limit' },
  { value: '7 days', label: '7 days' },
  { value: '14 days', label: '14 days' },
  { value: '30 days', label: '30 days' },
  { value: '60 days', label: '60 days' },
  { value: '90 days', label: '90 days' },
  { value: '6 months', label: '6 months' },
  { value: '12 months', label: '12 months' }
];

const cancellationWindowOptions = [
  { value: '', label: 'No cancellation window' },
  { value: '1 hour', label: '1 hour' },
  { value: '2 hours', label: '2 hours' },
  { value: '4 hours', label: '4 hours' },
  { value: '12 hours', label: '12 hours' },
  { value: '24 hours', label: '24 hours' },
  { value: '48 hours', label: '48 hours' },
  { value: '7 days', label: '7 days' }
];

const getServiceType = () => 'appointment';

const asBool = (value, fallback = false) => typeof value === 'boolean' ? value : fallback;

function WizardField({ label, children, wide = false }) {
  return (
    <label className={`service-wizard-field ${wide ? 'is-wide' : ''}`}>
      <span>{label}</span>
      {children}
    </label>
  );
}

function TogglePill({ checked, label, onChange }) {
  return (
    <button type="button" className={`service-wizard-toggle ${checked ? 'is-on' : ''}`} onClick={() => onChange(!checked)} aria-pressed={checked}>
      <span>{label}</span>
      <i aria-hidden="true" />
    </button>
  );
}

function SelectWithCustom({ value = '', options = [], onChange, customPlaceholder = 'Custom time' }) {
  const [customOpen, setCustomOpen] = useState(false);
  const normalizedValue = String(value || '');
  const optionValues = options.map(option => option.value);
  const isCustom = Boolean(normalizedValue) && !optionValues.includes(normalizedValue);
  const selectValue = isCustom || customOpen ? '__custom__' : normalizedValue;

  return (
    <div className="service-select-with-custom">
      <select
        value={selectValue}
        onChange={(event) => {
          const nextValue = event.target.value;
          if (nextValue === '__custom__') {
            setCustomOpen(true);
            onChange(isCustom ? normalizedValue : '');
            return;
          }
          setCustomOpen(false);
          onChange(nextValue);
        }}
      >
        {options.map(option => (
          <option key={`${option.value}-${option.label}`} value={option.value}>{option.label}</option>
        ))}
        <option value="__custom__">Custom</option>
      </select>
      {(selectValue === '__custom__' || isCustom) && (
        <input
          value={isCustom ? normalizedValue : ''}
          onChange={(event) => onChange(event.target.value)}
          placeholder={customPlaceholder}
        />
      )}
    </div>
  );
}

export function ServiceFileModal({
  isOpen,
  draft,
  selectedServiceExists,
  staffOptions,
  canManageWorkspace,
  onClose,
  onRemove,
  onSave,
  onUpdateDraft,
  onToggleStaff,
  onGalleryUpload,
  onRemoveGalleryImage
}) {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    if (isOpen) setStepIndex(0);
  }, [isOpen, draft?.id]);

  const bookingType = getServiceType(draft);
  const currentStep = wizardSteps[stepIndex] || wizardSteps[0];
  const selectedDuration = normalizeServiceDurationValue(draft.duration);
  const durationSummary = draft.durationMode === 'schedule' ? '' : formatServiceDuration(draft.duration);
  const copy = typeCopy[bookingType] || typeCopy.appointment;
  const canGoBack = stepIndex > 0;
  const isLastStep = stepIndex === wizardSteps.length - 1;

  if (!isOpen) return null;

  const update = (key, value) => onUpdateDraft(key, value);
  const nextStep = () => setStepIndex(index => Math.min(index + 1, wizardSteps.length - 1));
  const prevStep = () => setStepIndex(index => Math.max(index - 1, 0));

  const renderDetailsStep = () => (
    <div className="service-wizard-grid">
      <WizardField label="Service name" wide>
        <input value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder="Service name" />
      </WizardField>
      <WizardField label="Category">
        <input value={draft.category} onChange={(event) => update('category', event.target.value)} placeholder="Beauty, consulting, tutoring..." />
      </WizardField>
      <WizardField label="Visibility">
        <button type="button" className={`service-live-toggle ${draft.active ? 'is-live' : ''}`} onClick={() => update('active', !draft.active)}>
          {draft.active ? 'Live' : 'Hidden'}
        </button>
      </WizardField>
      <WizardField label="Description" wide>
        <textarea value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder="What is included, who it is for, and anything clients should know." rows={4} />
      </WizardField>
    </div>
  );

  const renderPhotosStep = () => (
    <div className="service-wizard-grid">
      <div className="service-media-panel is-wide">
        <div>
          <span>Gallery photos of services</span>
          <strong>{draft.imageUrls?.length ? `${draft.imageUrls.length} image${draft.imageUrls.length === 1 ? '' : 's'} added` : 'No images yet'}</strong>
        </div>
        <div className="service-media-grid">
          {(draft.imageUrls || []).slice(0, 8).map((url, index) => (
            <div key={`${url}-${index}`} className="service-media-thumb">
              <img src={url} alt="" />
              <button type="button" onClick={() => onRemoveGalleryImage(index)} aria-label="Remove image">
                <X size={13} />
              </button>
            </div>
          ))}
          <label className="service-media-add" aria-label="Upload service images">
            <Image size={18} />
            <input type="file" accept="image/*" multiple onChange={onGalleryUpload} />
          </label>
        </div>
        <p className="service-media-hint">
          <Image size={13} />
          <span>First photo becomes the booking card image. Additional photos open as a gallery.</span>
        </p>
      </div>
    </div>
  );

  const renderPricingStep = () => (
    <div className="service-wizard-grid">
      <WizardField label="Price type">
        <div className="service-segment-grid">
          {priceTypes.map(type => (
            <button key={type.id} type="button" className={draft.priceType === type.id ? 'is-active' : ''} onClick={() => update('priceType', type.id)}>
              {type.label}
            </button>
          ))}
        </div>
      </WizardField>
      <WizardField label="Price">
        <div className="service-money-row">
          <input value={draft.currency} onChange={(event) => update('currency', event.target.value)} aria-label="Currency" />
          <input value={draft.price} onChange={(event) => update('price', event.target.value)} placeholder={draft.priceType === 'quote' ? 'Optional' : '450'} aria-label="Price" />
        </div>
      </WizardField>
      <WizardField label="Tax">
        <input value={draft.taxRate || ''} onChange={(event) => update('taxRate', event.target.value)} placeholder="Optional, e.g. 15%" />
      </WizardField>
      <div className="service-adaptive-note is-wide">
        <DollarSign size={16} />
        <div>
          <strong>{formatServicePrice(draft) || 'No price shown yet'}</strong>
          <span>This is how the price will appear across the services desk and booking flow.</span>
        </div>
      </div>
    </div>
  );

  const renderDurationPicker = () => (
    <div className="service-duration-choice-panel">
      <button
        type="button"
        role="radio"
        aria-checked={draft.durationMode === 'schedule'}
        className={`service-duration-free-choice ${draft.durationMode === 'schedule' ? 'is-active' : ''}`}
        onClick={() => {
          update('durationMode', 'schedule');
          update('duration', '');
        }}
      >
        <Clock size={16} />
        <span>
          <strong>No fixed duration</strong>
          <small>Bookings use the time blocks you make available in Schedule.</small>
        </span>
      </button>
      <div className="service-duration-grid" role="radiogroup" aria-label="Service duration">
        {serviceDurationOptions.map(option => {
          const value = String(option.minutes);
          const active = draft.durationMode !== 'schedule' && selectedDuration === value;
          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? 'is-active' : ''}
              onClick={() => {
                update('durationMode', 'fixed');
                update('duration', value);
              }}
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderAvailabilityStep = () => (
    <div className="service-wizard-grid">
      <div className="service-wizard-field is-wide">
        <span>Duration</span>
        {renderDurationPicker()}
      </div>
      <WizardField label="Buffer before">
        <SelectWithCustom
          value={draft.bufferBefore || ''}
          options={bufferOptions}
          onChange={(value) => update('bufferBefore', value)}
          customPlaceholder="e.g. 20 min"
        />
      </WizardField>
      <WizardField label="Buffer after">
        <SelectWithCustom
          value={draft.bufferAfter || ''}
          options={bufferOptions}
          onChange={(value) => update('bufferAfter', value)}
          customPlaceholder="e.g. 20 min"
        />
      </WizardField>
    </div>
  );

  const renderDeliveryStep = () => (
    <div className="service-wizard-grid">
      <div className="service-adaptive-note is-wide">
        <Sparkles size={16} />
        <div>
          <strong>{copy.delivery}</strong>
          <span>{copy.deliveryHint}</span>
        </div>
      </div>
      <div className="service-staff-grid is-wide">
        {staffOptions.map(staff => {
          const active = draft.staffIds?.includes(staff.id);
          return (
            <button key={staff.id} type="button" onClick={() => onToggleStaff(staff.id)} className={active ? 'is-active' : ''}>
              <span style={{ background: active ? '#050505' : `${staff.color || '#755CFF'}20`, color: active ? '#fff' : staff.color || '#755CFF' }}>
                {getStaffInitial(staff)}
              </span>
              <strong>{staff.name || 'Staff'}</strong>
              <small>{active ? 'Assigned' : 'Available'}</small>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderLocationStep = () => {
    const locationType = draft.locationType || 'business';
    return (
      <div className="service-wizard-grid">
        <div className="service-location-grid is-wide">
          {locationOptions.map(option => {
            const Icon = option.icon;
            const active = locationType === option.id;
            return (
              <button key={option.id} type="button" className={active ? 'is-active' : ''} onClick={() => update('locationType', option.id)}>
                <Icon size={16} />
                <span>{option.label}</span>
              </button>
            );
          })}
        </div>
        {locationType === 'customer' && (
          <>
            <WizardField label="Service radius">
              <input value={draft.serviceRadius || ''} onChange={(event) => update('serviceRadius', event.target.value)} placeholder="e.g. 15 km" />
            </WizardField>
            <WizardField label="Travel fee">
              <input value={draft.travelFee || ''} onChange={(event) => update('travelFee', event.target.value)} placeholder="Optional" />
            </WizardField>
            <WizardField label="Travel time">
              <input value={draft.travelTime || ''} onChange={(event) => update('travelTime', event.target.value)} placeholder="e.g. 20 min" />
            </WizardField>
          </>
        )}
        {locationType === 'online' && (
          <>
            <WizardField label="Meeting link">
              <input value={draft.meetingLink || ''} onChange={(event) => update('meetingLink', event.target.value)} placeholder="Zoom, Meet, Teams..." />
            </WizardField>
            <WizardField label="Auto meeting">
              <TogglePill checked={asBool(draft.autoGenerateMeeting)} label="Auto-generate" onChange={(value) => update('autoGenerateMeeting', value)} />
            </WizardField>
          </>
        )}
        {locationType === 'custom' && (
          <WizardField label="Custom location" wide>
            <input value={draft.customVenue || ''} onChange={(event) => update('customVenue', event.target.value)} placeholder="Location name or address" />
          </WizardField>
        )}
      </div>
    );
  };

  const renderRulesStep = () => (
    <div className="service-wizard-grid">
      <WizardField label="Booking notice">
        <SelectWithCustom
          value={draft.bookingNotice || ''}
          options={bookingNoticeOptions}
          onChange={(value) => update('bookingNotice', value)}
          customPlaceholder="e.g. 36 hours"
        />
      </WizardField>
      <WizardField label="Maximum advance booking">
        <SelectWithCustom
          value={draft.maxAdvanceBooking || ''}
          options={advanceBookingOptions}
          onChange={(value) => update('maxAdvanceBooking', value)}
          customPlaceholder="e.g. 45 days"
        />
      </WizardField>
      <WizardField label="Cancellation window">
        <SelectWithCustom
          value={draft.cancellationWindow || ''}
          options={cancellationWindowOptions}
          onChange={(value) => update('cancellationWindow', value)}
          customPlaceholder="e.g. 18 hours"
        />
      </WizardField>
      <div className="service-rule-list is-wide">
        <TogglePill checked={asBool(draft.reschedulingAllowed, true)} label="Rescheduling allowed" onChange={(value) => update('reschedulingAllowed', value)} />
        <TogglePill checked={asBool(draft.depositRequired)} label="Deposit required" onChange={(value) => update('depositRequired', value)} />
        <TogglePill checked={asBool(draft.fullPaymentRequired)} label="Full payment required" onChange={(value) => update('fullPaymentRequired', value)} />
        <TogglePill checked={asBool(draft.approvalRequired)} label="Approval required" onChange={(value) => update('approvalRequired', value)} />
        <TogglePill checked={asBool(draft.repeatBookingsAllowed)} label="Allow repeat bookings" onChange={(value) => update('repeatBookingsAllowed', value)} />
      </div>
    </div>
  );

  const renderBookingCardPreviewStep = () => {
    const cardVariant = 'appointment';
    const previewByType = {
      appointment: {
        category: draft.category || 'Appointment',
        name: 'New Service',
        description: 'A polished one-to-one booking card with the same image, copy, and price layout clients see.',
        price: `${draft.currency || 'R'}850`,
        duration: '45 min'
      }
    };
    const previewDefaults = previewByType.appointment;
    const price = formatServicePrice(draft) || previewDefaults.price;
    const duration = draft.durationMode === 'schedule' ? '' : durationSummary || previewDefaults.duration;
    const previewCategory = draft.category || previewDefaults.category;
    const previewName = !draft.name || draft.name === 'New Service' ? previewDefaults.name : draft.name;
    const previewDescription = draft.description || previewDefaults.description;
    const hasImage = Boolean(draft.imageUrls?.[0]);

    return (
      <div className="service-booking-card-preview is-wide">
        <div className="booking-services-grid booking-services-rail booking-services-tiles booking-services-cards grid grid-cols-1 md:grid-cols-2 gap-3">
          <button
            type="button"
            className={`booking-service-option booking-service-variant-${cardVariant} appearance-none outline-none focus:outline-none rounded-2xl border p-4 md:p-5 transition-all booking-service-border-soft ${hasImage ? 'has-service-image' : 'has-service-image has-placeholder-image'}`}
            data-testid="booking-service-option"
            data-service-id={draft.id || 'preview-service'}
            data-card-variant={cardVariant}
          >
            <div className="booking-service-shell flex items-start gap-4">
              <div className={`booking-service-image w-14 h-14 rounded-2xl overflow-hidden shrink-0 flex items-center justify-center ${hasImage ? 'is-gallery-enabled' : ''}`}>
                {hasImage ? (
                  <>
                    <span className="booking-service-image-fallback" aria-hidden="true">
                      <span className="booking-service-image-placeholder" aria-hidden="true">
                        <span className="booking-service-image-placeholder-icon" />
                      </span>
                    </span>
                    <img src={draft.imageUrls[0]} alt="" className="w-full h-full object-cover" />
                  </>
                ) : (
                  <span className="booking-service-image-placeholder has-add-action" aria-hidden="true">
                    <span className="booking-service-image-placeholder-icon" />
                    <span className="booking-service-image-placeholder-action" />
                  </span>
                )}
              </div>
              <div className="booking-service-copy booking-service-main min-w-0">
                <div className="booking-service-title-line">
                  <div className="min-w-0">
                    <span className="booking-service-eyebrow">{previewCategory}</span>
                    <h5 className="text-base md:text-lg font-bold tracking-tight">{previewName}</h5>
                  </div>
                </div>
                <p className="booking-service-description text-xs md:text-sm mt-2 leading-relaxed">
                  {previewDescription}
                </p>
              </div>
              {(duration || price) && (
                <div className="booking-service-meta booking-service-side booking-service-facts" aria-label="Price and duration">
                  {price && (
                    <span className="booking-service-meta-item is-price">
                      <span className="booking-service-meta-label">Price</span>
                      <strong>{price}</strong>
                    </span>
                  )}
                  {duration && (
                    <span className="booking-service-meta-item is-duration">
                      <span className="booking-service-meta-label">Duration</span>
                      <strong>{duration}</strong>
                    </span>
                  )}
                </div>
              )}
            </div>
          </button>
        </div>
      </div>
    );
  };

  const renderStep = () => {
    if (currentStep.id === 'details') return renderDetailsStep();
    if (currentStep.id === 'pricing') return renderPricingStep();
    if (currentStep.id === 'availability') return renderAvailabilityStep();
    if (currentStep.id === 'photos') return renderPhotosStep();
    if (currentStep.id === 'delivery') return renderDeliveryStep();
    if (currentStep.id === 'location') return renderLocationStep();
    if (currentStep.id === 'preview') return renderBookingCardPreviewStep();
    return renderRulesStep();
  };

  return (
    <div className="service-modal fixed inset-0 z-[150] bg-black/45 backdrop-blur-sm p-3 md:p-6 flex items-end md:items-center justify-center">
      <div className="service-modal-panel service-wizard-panel w-full max-w-6xl max-h-[92vh] rounded-[1.75rem] bg-white border border-white/80 shadow-2xl shadow-black/25 overflow-hidden flex flex-col">
        <div className="service-wizard-header">
          <div className="min-w-0">
            <p>Create Service</p>
            <h2>{selectedServiceExists ? draft.name || 'Edit service' : 'Create service'}</h2>
            <span>Appointment setup wizard. Only relevant questions are shown.</span>
          </div>
          <button type="button" onClick={onClose} className="service-wizard-close" aria-label="Close service editor">
            <X size={18} />
          </button>
        </div>

        <div className="service-wizard-shell">
          <aside className="service-wizard-sidebar">
            <div className="service-step-list" aria-label="Service setup steps">
              {wizardSteps.map((step, index) => (
                <button
                  key={step.id}
                  type="button"
                  className={`${index === stepIndex ? 'is-active' : ''} ${index < stepIndex ? 'is-complete' : ''}`}
                  onClick={() => setStepIndex(index)}
                >
                  <span>{index < stepIndex ? <Check size={13} /> : index + 1}</span>
                  <strong>{step.label}</strong>
                </button>
              ))}
            </div>
          </aside>

          <main className="service-wizard-main">
            <div className="service-wizard-step-head">
              <span>Step {stepIndex + 1} of {wizardSteps.length}</span>
              <h3>{currentStep.title}</h3>
              <p>{currentStep.helper}</p>
            </div>
            {renderStep()}
          </main>
        </div>

        <div className="service-wizard-footer">
          <button
            type="button"
            onClick={onRemove}
            disabled={!draft.id || !selectedServiceExists || !canManageWorkspace}
            className="service-wizard-remove"
          >
            <Trash2 size={15} /> Remove
          </button>
          <div className="service-wizard-actions">
            <button type="button" onClick={canGoBack ? prevStep : onClose} className="service-wizard-secondary">
              {canGoBack ? <ArrowLeft size={15} /> : null}
              {canGoBack ? 'Back' : 'Cancel'}
            </button>
            {isLastStep ? (
              <button type="button" onClick={onSave} disabled={!canManageWorkspace} className="service-wizard-primary">
                <Check size={15} /> Save Service
              </button>
            ) : (
              <button type="button" onClick={nextStep} className="service-wizard-primary">
                Continue <ArrowRight size={15} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
