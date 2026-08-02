import { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Briefcase,
  Check,
  ChevronDown,
  Clock,
  Home,
  Image,
  MapPin,
  Trash2,
  Users,
  Video,
  X
} from 'lucide-react';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import {
  getScheduleTypeMeta,
  normalizeScheduleType,
  scheduleTypeRequiresApproval
} from '../../../utils/scheduleTypes';
import {
  getStaffInitial,
  priceTypes,
  normalizeServiceDurationValue,
  serviceScheduleTypeOptions
} from '../servicesStudioModel';

const wizardSteps = [
  { id: 'type', label: 'Type', title: 'Booking type', helper: 'Choose how clients reserve this service.' },
  { id: 'details', label: 'Details', title: 'Service details', helper: 'Name, description, category, and visibility.' },
  { id: 'pricing', label: 'Pricing', title: 'Pricing', helper: 'Choose how this service is charged.' },
  { id: 'delivery', label: 'Team', title: 'Assign staff members', helper: 'Choose which team members can run or manage this service.' },
  { id: 'photos', label: 'Photos', title: 'Service photos', helper: 'Add the images clients see on the booking page service card.' },
  { id: 'location', label: 'Location', title: 'Location', helper: 'Choose where the service happens and add travel or online details.' },
  { id: 'rules', label: 'Rules', title: 'Booking rules', helper: 'Control notice, payment, approval, cancellation, and repeat bookings.' },
  { id: 'preview', label: 'Preview', title: 'Booking page card', helper: 'See the exact service card style clients will see on the booking page.' }
];

const stepCopyByType = {
  appointment: {
    details: { label: 'Details', title: 'Appointment details', helper: 'Name the service clearly, set the duration, and describe what the one-to-one booking includes.' },
    pricing: { label: 'Pricing', title: 'Appointment pricing', helper: 'Set the client-facing price for this one-to-one booking.' }
  },
  class_session: {
    details: { label: 'Details', title: 'Spot booking details', helper: 'Name the class, workshop, or session, then set duration and capacity.' }
  }
};

const priceTypesByType = {
  appointment: ['fixed', 'free', 'quote'],
  class_session: ['fixed', 'free', 'quote']
};

const APPOINTMENT_CATEGORY_OPTIONS = Object.freeze([
  'Beauty & salon',
  'Barbering',
  'Nails',
  'Brows & lashes',
  'Makeup',
  'Skincare',
  'Spa & massage',
  'Wellness',
  'Fitness coaching',
  'Personal training',
  'Health consult',
  'Therapy & counselling',
  'Coaching',
  'Consulting',
  'Professional services',
  'Finance & tax',
  'Legal consult',
  'Real estate',
  'Photography',
  'Creative studio',
  'Music studio',
  'Tutoring',
  'Childcare',
  'Restaurant booking',
  'Tasting experience',
  'Venue viewing',
  'Rental appointment',
  'Cleaning',
  'Automotive',
  'Pet grooming',
  'Pet care',
  'Community service',
  'Other appointment'
]);

const SEAT_CATEGORY_OPTIONS = Object.freeze([
  'Workshop',
  'Class',
  'Course',
  'Training session',
  'Group session',
  'Masterclass',
  'Seminar',
  'Bootcamp',
  'Cohort programme',
  'Fitness class',
  'Yoga class',
  'Pilates class',
  'Dance class',
  'Kids class',
  'Tutoring group',
  'Cooking class',
  'Baking class',
  'Art class',
  'Music class',
  'Language class',
  'Wellness session',
  'Support group',
  'Tasting session',
  'Studio session',
  'Drop-in session',
  'Spot booking'
]);

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

const getServiceType = (service = {}) => normalizeScheduleType(service.scheduleType || service.bookingType || service.serviceType);

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

function ServiceCategoryMenu({ customOptions = [], onChange, type = 'appointment', value = '' }) {
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState('');
  const baseOptions = type === 'class_session' ? SEAT_CATEGORY_OPTIONS : APPOINTMENT_CATEGORY_OPTIONS;
  const options = useMemo(() => {
    const seen = new Set();
    return [...baseOptions, ...customOptions, value]
      .map(option => String(option || '').trim())
      .filter(Boolean)
      .filter(option => {
        const key = option.toLowerCase();
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  }, [baseOptions, customOptions, value]);
  const filteredCustomValue = customValue.trim();

  const choose = (option) => {
    onChange(option);
    setOpen(false);
    setCustomValue('');
  };

  const addCustom = () => {
    if (!filteredCustomValue) return;
    choose(filteredCustomValue);
  };

  return (
    <div className={`service-category-menu ${open ? 'is-open' : ''}`}>
      <button type="button" className="service-category-menu-trigger" onClick={() => setOpen(current => !current)} aria-expanded={open}>
        <span>{value || 'Choose category'}</span>
        <ChevronDownIcon />
      </button>
      {open ? (
        <div className="service-category-menu-popover">
          <div className="service-category-menu-list">
            {options.map(option => (
              <button key={option} type="button" className={option === value ? 'is-active' : ''} onClick={() => choose(option)}>
                <span>{option}</span>
                {option === value ? <Check size={13} /> : null}
              </button>
            ))}
          </div>
          <div className="service-category-custom">
            <input
              value={customValue}
              onChange={(event) => setCustomValue(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  addCustom();
                }
              }}
              placeholder={type === 'class_session' ? 'Add custom spot category' : 'Add custom appointment category'}
            />
            <button type="button" onClick={addCustom} disabled={!filteredCustomValue}>Add</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function DurationMenu({ allowSchedule = false, durationMode = 'fixed', onChange, value = '' }) {
  const [open, setOpen] = useState(false);
  const [hours, setHours] = useState('');
  const [minutes, setMinutes] = useState('');
  const normalizedValue = normalizeServiceDurationValue(value);
  const selectedLabel = durationMode === 'schedule'
    ? 'No fixed duration'
    : normalizedValue
      ? formatServiceDuration(normalizedValue)
      : 'Choose duration';

  const chooseDuration = (nextValue, nextMode = 'fixed') => {
    onChange(nextValue, nextMode);
    setOpen(false);
    setHours('');
    setMinutes('');
  };

  const applyCustomDuration = () => {
    const hourValue = Number(hours || 0);
    const minuteValue = Number(minutes || 0);
    if (!Number.isFinite(hourValue) || !Number.isFinite(minuteValue)) return;
    const totalMinutes = Math.round((hourValue * 60) + minuteValue);
    if (totalMinutes <= 0) return;
    chooseDuration(String(totalMinutes), 'fixed');
  };
  const canApply = Number(hours || 0) > 0 || Number(minutes || 0) > 0;

  return (
    <div className={`service-category-menu service-duration-menu ${open ? 'is-open' : ''}`}>
      <button type="button" className="service-category-menu-trigger" onClick={() => setOpen(current => !current)} aria-expanded={open}>
        <span>{selectedLabel}</span>
        <ChevronDownIcon />
      </button>
      {open ? (
        <div className="service-category-menu-popover service-duration-menu-popover">
          {allowSchedule ? (
            <button type="button" className={`service-duration-schedule-choice ${durationMode === 'schedule' ? 'is-active' : ''}`} onClick={() => chooseDuration('', 'schedule')}>
              <span>
                <strong>No fixed duration</strong>
                <small>Use the booking blocks you make available in Schedule.</small>
              </span>
              {durationMode === 'schedule' ? <Check size={14} /> : null}
            </button>
          ) : null}
          <div className="service-duration-custom">
            <div className="service-duration-custom-head">
              <strong>Set fixed duration</strong>
              <span>Fill in hours, minutes, or both.</span>
            </div>
            <div className="service-duration-slot-row">
              <label>
                <input
                  type="number"
                  min="0"
                  step="1"
                  value={hours}
                  onChange={(event) => setHours(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyCustomDuration();
                    }
                  }}
                  placeholder="0"
                />
                <span>Hours</span>
              </label>
              <label>
                <input
                  type="number"
                  min="0"
                  step="5"
                  value={minutes}
                  onChange={(event) => setMinutes(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      applyCustomDuration();
                    }
                  }}
                  placeholder="30"
                />
                <span>Minutes</span>
              </label>
            </div>
            <button type="button" onClick={applyCustomDuration} disabled={!canApply}>Set duration</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ChevronDownIcon() {
  return <ChevronDown size={14} aria-hidden="true" />;
}

export function ServiceFileModal({
  isOpen,
  draft,
  businessCurrency = 'R',
  categoryOptions = [],
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
    if (isOpen) {
      setStepIndex(0);
    }
  }, [isOpen, draft?.id]);

  const bookingType = getServiceType(draft);
  const allowedPriceTypeIds = priceTypesByType[bookingType] || priceTypesByType.appointment;
  const activePriceType = allowedPriceTypeIds.includes(draft.priceType) ? draft.priceType : allowedPriceTypeIds[0];
  const priceCurrency = getCurrencyPrefix(businessCurrency || draft.currency || 'R');
  const steps = wizardSteps
    .map(step => ({
      ...step,
      ...(stepCopyByType[bookingType]?.[step.id] || {})
    }));
  const currentStep = steps[stepIndex] || steps[0];
  const durationSummary = draft.durationMode === 'schedule' ? '' : formatServiceDuration(draft.duration);
  const canGoBack = stepIndex > 0;
  const isLastStep = stepIndex === steps.length - 1;

  if (!isOpen) return null;

  const update = (key, value) => onUpdateDraft(key, value);
  const updateBookingStyle = (nextType) => {
    const scheduleType = normalizeScheduleType(nextType);
    onUpdateDraft('scheduleType', scheduleType);
    onUpdateDraft('bookingType', scheduleType);
    onUpdateDraft('serviceType', scheduleType);
    if (scheduleType === 'class_session') {
      if (!draft.name || draft.name === 'New Service') onUpdateDraft('name', 'New Class Session');
      if (!draft.category) onUpdateDraft('category', 'Spots');
    }
    if (scheduleType === 'appointment' && (!draft.name || draft.name === 'New Service')) onUpdateDraft('name', 'New Service');
    if (scheduleTypeRequiresApproval(scheduleType)) onUpdateDraft('approvalRequired', true);
  };
  const nextStep = () => setStepIndex(index => Math.min(index + 1, steps.length - 1));
  const prevStep = () => setStepIndex(index => Math.max(index - 1, 0));
  const renderDetailsStep = () => {
    const detailCopy = {
      appointment: {
        name: 'Appointment name',
        category: 'Service category',
        placeholder: 'e.g. Skin consultation, Strategy call, Haircut',
        categoryPlaceholder: 'Beauty, consulting, tutoring...',
        description: 'What happens in the appointment, who it is for, and what clients should know before arriving.'
      },
      class_session: {
        name: 'Spot booking name',
        category: 'Spot category',
        placeholder: 'e.g. Beginner bread workshop',
        categoryPlaceholder: 'Workshop, fitness, music, tutoring...',
        description: 'Class level, what attendees learn, what is included, and what they should bring.'
      }
    }[bookingType] || {};

    return (
      <div className="service-wizard-grid">
        <WizardField label={detailCopy.name || 'Service name'} wide>
          <input value={draft.name} onChange={(event) => update('name', event.target.value)} placeholder={detailCopy.placeholder || 'Service name'} />
        </WizardField>
        <WizardField label={detailCopy.category || 'Category'}>
          <ServiceCategoryMenu
            customOptions={categoryOptions}
            onChange={(value) => update('category', value)}
            type={bookingType}
            value={draft.category}
          />
        </WizardField>
        <WizardField label="Duration">
          <DurationMenu
            allowSchedule={bookingType === 'appointment'}
            durationMode={draft.durationMode || 'fixed'}
            value={draft.duration || ''}
            onChange={(value, mode) => {
              update('durationMode', mode);
              update('duration', normalizeServiceDurationValue(value) || value);
            }}
          />
        </WizardField>
        {bookingType === 'class_session' ? (
          <WizardField label="Capacity">
            <input type="number" min="1" value={draft.capacity || 1} onChange={(event) => update('capacity', event.target.value)} placeholder="12" />
          </WizardField>
        ) : null}
        <WizardField label="Visibility">
          <button type="button" className={`service-live-toggle ${draft.active ? 'is-live' : ''}`} onClick={() => update('active', !draft.active)}>
            {draft.active ? 'Live' : 'Hidden'}
          </button>
        </WizardField>
        <WizardField label="Description" wide>
          <textarea value={draft.description} onChange={(event) => update('description', event.target.value)} placeholder={detailCopy.description || 'What is included, who it is for, and anything clients should know.'} rows={4} />
        </WizardField>
      </div>
    );
  };

  const renderPhotosStep = () => (
    <div className="service-wizard-grid">
      <div className="service-media-panel is-wide">
        <div className="service-media-panel-head">
          <div>
            <span>Service photos</span>
            <strong>{draft.imageUrls?.length ? `${draft.imageUrls.length} image${draft.imageUrls.length === 1 ? '' : 's'} added` : 'Add a cover photo'}</strong>
          </div>
          <label className="service-media-upload-button" aria-label="Upload service images">
            <Image size={15} />
            <span>Add photos</span>
            <input type="file" accept="image/*" multiple onChange={onGalleryUpload} />
          </label>
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
            <span>{draft.imageUrls?.length ? 'Add more' : 'Upload cover'}</span>
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

  const renderStyleStep = () => (
    <div className="service-wizard-grid">
      <div className="service-style-grid is-wide" role="radiogroup" aria-label="Booking style">
        {serviceScheduleTypeOptions.map(option => {
          const active = bookingType === option.id;
          const Icon = option.id === 'appointment' ? Clock
            : Users;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              aria-checked={active}
              className={active ? 'is-active native-gradient-ring' : ''}
              onClick={() => updateBookingStyle(option.id)}
            >
              <Icon size={17} />
              <span>
                <strong>{option.setupLabel}</strong>
                <small>{option.description}</small>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );

  const renderPricingStep = () => {
    return (
      <div className="service-wizard-grid">
        <WizardField label="Price type">
          <div className="service-segment-grid">
            {priceTypes
              .filter(type => allowedPriceTypeIds.includes(type.id))
              .map(type => (
              <button key={type.id} type="button" className={activePriceType === type.id ? 'is-active' : ''} onClick={() => update('priceType', type.id)}>
                {type.label}
              </button>
            ))}
          </div>
        </WizardField>
        <WizardField label="Price">
          <div className="service-money-row">
            <span className="service-money-prefix" aria-label={`Currency ${priceCurrency}`}>{priceCurrency}</span>
            <input value={draft.price} onChange={(event) => update('price', event.target.value)} placeholder={activePriceType === 'quote' ? 'Optional' : '450'} aria-label="Price" />
          </div>
        </WizardField>
      </div>
    );
  };

  const renderDeliveryStep = () => (
    <div className="service-wizard-grid">
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
      <div className="service-rule-list is-wide">
        <TogglePill checked={asBool(draft.reschedulingAllowed, true)} label="Rescheduling allowed" onChange={(value) => update('reschedulingAllowed', value)} />
        <TogglePill checked={asBool(draft.depositRequired)} label="Deposit required" onChange={(value) => update('depositRequired', value)} />
        <TogglePill checked={asBool(draft.fullPaymentRequired)} label="Full payment required" onChange={(value) => update('fullPaymentRequired', value)} />
        <TogglePill checked={asBool(draft.approvalRequired, scheduleTypeRequiresApproval(bookingType))} label="Approval required" onChange={(value) => update('approvalRequired', value)} />
        <TogglePill checked={asBool(draft.repeatBookingsAllowed)} label="Allow repeat bookings" onChange={(value) => update('repeatBookingsAllowed', value)} />
      </div>
    </div>
  );

  const renderBookingCardPreviewStep = () => {
    const cardVariant = bookingType;
    const previewByType = {
      appointment: {
        category: draft.category || 'Appointment',
        name: 'New Service',
        description: 'A polished one-to-one booking card with the same image, copy, and price layout clients see.',
        price: `${priceCurrency}850`,
        duration: '45 min'
      },
      class_session: {
        category: draft.category || 'Class',
        name: 'Saturday Workshop',
        description: 'A scheduled group session with spots, instructor, waitlist, and attendee management.',
        price: `${priceCurrency}650`,
        duration: '3 hours'
      }
    };
    const previewDefaults = previewByType[bookingType] || previewByType.appointment;
    const price = formatServicePrice({ ...draft, currency: priceCurrency, priceType: activePriceType }) || previewDefaults.price;
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
    if (currentStep.id === 'type') return renderStyleStep();
    if (currentStep.id === 'pricing') return renderPricingStep();
    if (currentStep.id === 'photos') return renderPhotosStep();
    if (currentStep.id === 'delivery') return renderDeliveryStep();
    if (currentStep.id === 'location') return renderLocationStep();
    if (currentStep.id === 'preview') return renderBookingCardPreviewStep();
    return renderRulesStep();
  };

  return (
    <div className="service-modal service-native-gradient-skin fixed inset-0 z-[150] bg-black/45 backdrop-blur-sm p-3 md:p-6 flex items-end md:items-center justify-center">
      <div className="service-modal-panel service-wizard-panel w-full max-w-6xl max-h-[92vh] rounded-[1.75rem] bg-white border border-white/80 shadow-2xl shadow-black/25 overflow-hidden flex flex-col">
        <div className="service-wizard-header">
          <div className="min-w-0">
            <p>Create Service</p>
            <h2>{selectedServiceExists ? draft.name || 'Edit service' : 'Create service'}</h2>
            <span>{getScheduleTypeMeta(bookingType).singular} setup wizard. Only relevant questions are shown.</span>
          </div>
          <button type="button" onClick={onClose} className="service-wizard-close" aria-label="Close service editor">
            <X size={18} />
          </button>
        </div>

        <div className="service-wizard-shell">
          <aside className="service-wizard-sidebar">
            <div className="service-step-list" aria-label="Service setup steps">
              {steps.map((step, index) => (
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
              <span>Step {stepIndex + 1} of {steps.length}</span>
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

const getCurrencyPrefix = (currency = '') => {
  const normalized = String(currency || '').trim().toUpperCase();
  if (!normalized) return 'R';
  const symbols = {
    ZAR: 'R',
    USD: '$',
    GBP: '£',
    EUR: '€',
    AUD: 'A$',
    CAD: 'C$',
    NGN: '₦',
    KES: 'KSh',
    BWP: 'P'
  };
  return symbols[normalized] || currency;
};
