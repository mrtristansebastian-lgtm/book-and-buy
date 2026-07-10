import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  BriefcaseBusiness,
  Building2,
  Camera,
  Car,
  Check,
  DollarSign,
  Dumbbell,
  GraduationCap,
  Home,
  Hotel,
  Image as ImageIcon,
  Megaphone,
  PawPrint,
  PlayCircle,
  Scissors,
  Search,
  Sparkles,
  SprayCan,
  Store,
  Utensils,
  Wrench,
  X
} from 'lucide-react';
import { OnboardingCompleteCard } from './OnboardingCompleteCard';
import { OnboardingProgressPath } from './OnboardingProgressPath';
import { ScheduleSettingsModal } from '../../schedule/components/ScheduleSettingsModal';
import { ScheduleSlotEditorModal } from '../../schedule/components/ScheduleSlotEditorModal';
import { formatSlotEditorValue, getNextOpenTime, parseSlotValue, sortSlotValues, timeValueToMinutes } from '../../schedule/utils/businessCalendarUtils';
import { formatServiceDuration, formatServicePrice } from '../../../utils/services';
import {
  availabilityPresets,
  buildOnboardingDefaults,
  createIndustryPreset,
  industryGroups,
  industryPresets
} from '../utils/onboardingModel';

const steps = [
  { id: 'business', number: '01', title: 'Business Type', short: 'Pick your lane' },
  { id: 'welcome', number: '02', title: 'Details', short: 'Name & contact' },
  { id: 'services', number: '03', title: 'Services', short: 'Visible service' },
  { id: 'availability', number: '04', title: 'Schedule', short: 'Bookable times' },
  { id: 'preview', number: '05', title: 'Publish', short: 'Readiness check' }
];

const industryIcons = {
  salon: <Scissors size={22} />,
  fitness: <Dumbbell size={22} />,
  rentals: <Store size={22} />,
  classes: <GraduationCap size={22} />,
  barber: <Scissors size={22} />,
  spa: <Sparkles size={22} />,
  nails: <Sparkles size={22} />,
  tutor: <GraduationCap size={22} />,
  childcare: <Baby size={22} />,
  venue: <Building2 size={22} />,
  photography: <Camera size={22} />,
  musicstudio: <PlayCircle size={22} />,
  events: <Megaphone size={22} />,
  restaurant: <Utensils size={22} />,
  accommodation: <Hotel size={22} />,
  cleaning: <SprayCan size={22} />,
  trades: <Wrench size={22} />,
  automotive: <Car size={22} />,
  petcare: <PawPrint size={22} />,
  consulting: <BriefcaseBusiness size={22} />,
  realestate: <Home size={22} />,
  creative: <Sparkles size={22} />,
  nonprofit: <Megaphone size={22} />,
  custom: <Sparkles size={22} />
};

const serviceDurationOptions = [
  { label: '15 min', minutes: '15' },
  { label: '30 min', minutes: '30' },
  { label: '45 min', minutes: '45' },
  { label: '60 min', minutes: '60' },
  { label: '90 min', minutes: '90' },
  { label: '120 min', minutes: '120' }
];

export function BusinessOnboardingPage({
  bookingPageUrl,
  isGuestWorkspace,
  onApply,
  onCopyBookingLink,
  onEditBookingPage,
  onFinishLater,
  onOpenDashboard,
  settings,
  user
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyScope, setApplyScope] = useState('always');
  const [scheduleSlotEditor, setScheduleSlotEditor] = useState(null);
  const [serviceQuestionIndex, setServiceQuestionIndex] = useState(0);
  const [draft, setDraft] = useState(() => ({
    industry: settings.serviceIndustry || 'salon',
    brandName: settings.brandName && settings.brandName !== 'Your Business' ? settings.brandName : '',
    tagline: settings.tagline || '',
    businessDescription: settings.businessDescription || settings.welcomeMessage || '',
    businessEmail: settings.businessEmail || user?.email || '',
    accent: settings.primaryColor || '#16A34A',
    availability: 'weekdays',
    locationMode: 'my_location',
    services: [],
    rules: {
      bookingNotice: '24h',
      cancellationWindow: '24h',
      holdMode: 'pending_confirmed',
      waitlist: true,
      reschedulingAllowed: true
    }
  }));
  const [businessTypeQuery, setBusinessTypeQuery] = useState('');

  const preset = createIndustryPreset(draft.industry);
  const selectedServices = draft.services.length ? draft.services : preset.services;
  const selectedAvailability = availabilityPresets[draft.availability] || availabilityPresets.weekdays;
  const defaultSlots = sortSlotValues(draft.defaultSlots?.length ? draft.defaultSlots : selectedAvailability.availableTimes);
  const allBusinessTypes = useMemo(() => (
    industryGroups.flatMap(group => group.businessTypes
      .map(id => ({ id, group: group.label, option: industryPresets[id] }))
      .filter(({ option }) => Boolean(option)))
  ), []);
  const visibleBusinessTypes = useMemo(() => {
    const query = businessTypeQuery.trim().toLowerCase();
    if (!query) return allBusinessTypes;
    return allBusinessTypes.filter(({ group, option }) => (
      option.label.toLowerCase().includes(query)
      || option.goal.toLowerCase().includes(query)
      || group.toLowerCase().includes(query)
    ));
  }, [allBusinessTypes, businessTypeQuery]);
  const stepId = steps[currentStep].id;
  const launchScore = complete ? 100 : Math.round(((currentStep + 1) / steps.length) * 100);
  const hasVisibleService = selectedServices.some(service => service?.name?.trim() && String(service.duration || '').trim());
  const serviceQuestionCount = 7;
  const isLastServiceQuestion = serviceQuestionIndex >= serviceQuestionCount - 1;
  const canContinue = useMemo(() => {
    if (stepId === 'welcome') return Boolean((draft.brandName || '').trim());
    if (stepId === 'services') return hasVisibleService && isLastServiceQuestion;
    return true;
  }, [draft.brandName, hasVisibleService, isLastServiceQuestion, stepId]);

  const updateDraft = (patch) => setDraft(prev => ({ ...prev, ...patch }));
  const updateRules = (patch) => setDraft(prev => ({ ...prev, rules: { ...prev.rules, ...patch } }));
  const updateDefaultSlots = (slots) => updateDraft({ defaultSlots: sortSlotValues(slots) });

  const goNext = async () => {
    if (!canContinue || saving) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(step => step + 1);
      return;
    }
    setSaving(true);
    const patch = buildOnboardingDefaults(draft, settings);
    const saved = await onApply(patch);
    setSaving(false);
    if (saved) setComplete(true);
  };

  const goBack = () => setCurrentStep(step => Math.max(0, step - 1));
  const skipCurrentStep = () => {
    if (saving) return;
    if (currentStep < steps.length - 1) {
      setCurrentStep(step => step + 1);
      return;
    }
    goNext();
  };

  const chooseBusinessType = (id, option) => updateDraft({
    industry: id,
    accent: option.accent,
    tagline: option.tagline,
    services: option.services
  });

  const updateService = (index, patch) => {
    const sourceServices = selectedServices.length ? selectedServices : preset.services;
    const next = sourceServices.map((service, serviceIndex) => (
      serviceIndex === index ? { ...service, ...patch } : service
    ));
    updateDraft({ services: next });
  };

  const readImageFileAsDataUrl = (file) => new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => resolve('');
    reader.readAsDataURL(file);
  });

  const handleServiceImageUpload = async (index, event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (!files.length) return;
    const imageUrls = (await Promise.all(files.map(readImageFileAsDataUrl))).filter(Boolean);
    const currentImages = Array.isArray(selectedServices[index]?.imageUrls)
      ? selectedServices[index].imageUrls
      : [];
    updateService(index, { imageUrls: [...currentImages, ...imageUrls].slice(0, 8) });
    event.target.value = '';
  };

  const removeServiceImage = (serviceIndex, imageIndex) => {
    const currentImages = Array.isArray(selectedServices[serviceIndex]?.imageUrls)
      ? selectedServices[serviceIndex].imageUrls
      : [];
    updateService(serviceIndex, {
      imageUrls: currentImages.filter((_, index) => index !== imageIndex)
    });
  };

  const primaryService = selectedServices[0] || preset.services[0] || {
    name: '',
    category: '',
    description: '',
    duration: '60',
    price: ''
  };
  const goNextServiceQuestion = () => setServiceQuestionIndex(index => Math.min(serviceQuestionCount - 1, index + 1));
  const goBackServiceQuestion = () => setServiceQuestionIndex(index => Math.max(0, index - 1));
  const selectedDate = new Date().toISOString().slice(0, 10);
  const scheduleTemplates = useMemo(() => ([
    {
      id: 'launch-weekdays',
      name: 'Weekday rhythm',
      description: 'Starter weekday slots for launch.',
      defaultTimes: availabilityPresets.weekdays.availableTimes,
      waitlistEnabled: draft.rules.waitlist !== false
    },
    {
      id: 'launch-evenings',
      name: 'Afternoons & evenings',
      description: 'Later slots for after-work bookings.',
      defaultTimes: availabilityPresets.evenings.availableTimes,
      waitlistEnabled: draft.rules.waitlist !== false
    },
    {
      id: 'launch-weekends',
      name: 'Weekend friendly',
      description: 'Saturday and Sunday starter slots.',
      defaultTimes: availabilityPresets.weekends.availableTimes,
      waitlistEnabled: draft.rules.waitlist !== false
    }
  ]), [draft.rules.waitlist]);

  const startAddingDefaultSlot = () => setScheduleSlotEditor({
    originalTime: null,
    isDefaultSlot: true,
    calendarId: 'workspace',
    label: 'Default slots',
    mode: 'single',
    start: getNextOpenTime(defaultSlots),
    end: ''
  });

  const startEditingDefaultSlot = (time) => {
    if (!time) return;
    setScheduleSlotEditor({
      originalTime: time,
      isDefaultSlot: true,
      calendarId: 'workspace',
      label: 'Default slots',
      ...parseSlotValue(time)
    });
  };

  const saveScheduleSlotEditor = () => {
    const slotValue = formatSlotEditorValue(scheduleSlotEditor);
    if (!slotValue) return;
    if (
      scheduleSlotEditor?.mode === 'range'
      && (!scheduleSlotEditor.end || timeValueToMinutes(scheduleSlotEditor.end) <= timeValueToMinutes(scheduleSlotEditor.start))
    ) return;
    if (defaultSlots.includes(slotValue) && slotValue !== scheduleSlotEditor.originalTime) return;
    const nextSlots = scheduleSlotEditor.originalTime
      ? defaultSlots.map(time => time === scheduleSlotEditor.originalTime ? slotValue : time)
      : [...defaultSlots, slotValue];
    updateDefaultSlots(nextSlots);
    setScheduleSlotEditor(null);
  };

  const deleteScheduleSlotFromEditor = () => {
    if (scheduleSlotEditor?.originalTime) {
      updateDefaultSlots(defaultSlots.filter(time => time !== scheduleSlotEditor.originalTime));
    }
    setScheduleSlotEditor(null);
  };

  const applyScheduleTemplate = (templateId) => {
    const template = scheduleTemplates.find(item => item.id === templateId);
    if (!template) return;
    updateDefaultSlots(template.defaultTimes);
    if (templateId === 'launch-evenings') updateDraft({ availability: 'evenings' });
    if (templateId === 'launch-weekends') updateDraft({ availability: 'weekends' });
    if (templateId === 'launch-weekdays') updateDraft({ availability: 'weekdays' });
  };

  const renderIdentityFields = () => (
    <div className="onboarding-form-card">
      <label className="onboarding-question">
        <span>Business name</span>
        <input
          autoFocus
          value={draft.brandName}
          onChange={(event) => updateDraft({ brandName: event.target.value })}
          placeholder={user?.displayName ? `${user.displayName}'s Studio` : 'Your Business'}
        />
      </label>
      <label className="onboarding-question">
        <span>Tagline optional</span>
        <input
          value={draft.tagline}
          onChange={(event) => updateDraft({ tagline: event.target.value })}
          placeholder={preset.tagline}
        />
      </label>
      <label className="onboarding-question">
        <span>Business email</span>
        <input
          value={draft.businessEmail}
          onChange={(event) => updateDraft({ businessEmail: event.target.value })}
          placeholder="hello@yourbusiness.com"
        />
      </label>
      <label className="onboarding-question">
        <span>Business description</span>
        <textarea
          value={draft.businessDescription}
          onChange={(event) => updateDraft({ businessDescription: event.target.value })}
          placeholder="Tell clients what you do, who you help, and what they can expect."
          rows={5}
        />
      </label>
    </div>
  );

  const renderStep = () => {
    if (stepId === 'welcome') {
      return (
        <div className="onboarding-start-fields">
          {renderIdentityFields()}
        </div>
      );
    }

    if (stepId === 'business') {
      return (
        <div className="onboarding-business-step">
          <section className="onboarding-type-panel" aria-label="Business type">
            <div className="onboarding-type-panel-head onboarding-question">
              <div>
                <p className="onboarding-specific-label">Business type</p>
                <h2>What kind of business are you launching?</h2>
              </div>
              <div className="onboarding-selected-type">
                <span className="onboarding-choice-icon" aria-hidden="true">{industryIcons[draft.industry] || <Store size={22} />}</span>
                <div>
                  <p>Selected type</p>
                  <strong>{preset.label}</strong>
                  <small>{selectedServices.length} starter services suggested next.</small>
                </div>
              </div>
            </div>
            <label className="onboarding-type-search onboarding-question">
              <span className="onboarding-choice-icon" aria-hidden="true"><Search size={20} /></span>
              <span className="sr-only">Search business types</span>
              <input
                value={businessTypeQuery}
                onChange={(event) => setBusinessTypeQuery(event.target.value)}
                placeholder="Search salon, gym, tutor, rental, studio..."
              />
            </label>
            <div className="onboarding-type-list onboarding-question" role="listbox" aria-label="Business types">
              {visibleBusinessTypes.length ? (
                visibleBusinessTypes.map(({ id, group, option }) => (
                  <button
                    key={id}
                    type="button"
                    className={draft.industry === id ? 'is-active' : ''}
                    aria-selected={draft.industry === id}
                    role="option"
                    onClick={() => chooseBusinessType(id, option)}
                  >
                    <span className="onboarding-choice-icon" aria-hidden="true">{industryIcons[id] || <Store size={22} />}</span>
                    <span>
                      <strong>{option.label}</strong>
                      <small>{group} - {option.goal}</small>
                    </span>
                    {draft.industry === id && <em>Selected</em>}
                  </button>
                ))
              ) : (
                <p className="onboarding-type-empty">No exact match yet. Choose "Something else" or try a broader word like class, rental, beauty, home, or creative.</p>
              )}
            </div>
          </section>
        </div>
      );
    }

    if (stepId === 'services') {
      const serviceQuestionMeta = [
        ['Name', 'What should clients book?'],
        ['Category', 'How should we group it?'],
        ['Visibility', 'Should it be live?'],
        ['Location', 'Where does it happen?'],
        ['Description', 'What should clients know?'],
        ['Photos', 'Show the service visually.'],
        ['Price & duration', 'Finish the booking card.']
      ];
      const renderServiceQuestion = () => {
        if (serviceQuestionIndex === 0) {
          return (
            <label className="service-wizard-field is-wide onboarding-question">
              <span>Service name</span>
              <input
                autoFocus
                value={primaryService.name}
                onChange={(event) => updateService(0, { name: event.target.value })}
                placeholder="Signature Appointment"
              />
            </label>
          );
        }
        if (serviceQuestionIndex === 1) {
          return (
            <label className="service-wizard-field is-wide onboarding-question">
              <span>Category</span>
              <input
                autoFocus
                value={primaryService.category || preset.label}
                onChange={(event) => updateService(0, { category: event.target.value })}
                placeholder="Beauty, consulting, tutoring..."
              />
            </label>
          );
        }
        if (serviceQuestionIndex === 2) {
          return (
            <label className="service-wizard-field is-wide onboarding-question">
              <span>Visibility</span>
              <button
                type="button"
                className={`service-live-toggle ${primaryService.active === false ? '' : 'is-live'}`}
                onClick={() => updateService(0, { active: primaryService.active === false })}
              >
                {primaryService.active === false ? 'Hidden for now' : 'Live on booking page'}
              </button>
            </label>
          );
        }
        if (serviceQuestionIndex === 3) {
          return (
            <div className="service-wizard-field is-wide onboarding-question">
              <span>Where is this service done?</span>
              <div className="service-location-grid">
                {[
                  ['online', 'Online'],
                  ['my_location', 'At my location'],
                  ['mobile', 'I travel to clients']
                ].map(([id, label]) => (
                  <button
                    key={id}
                    type="button"
                    className={draft.locationMode === id ? 'is-active' : ''}
                    onClick={() => updateDraft({ locationMode: id })}
                    aria-pressed={draft.locationMode === id}
                  >
                    <Check size={16} /> {label}
                  </button>
                ))}
              </div>
            </div>
          );
        }
        if (serviceQuestionIndex === 4) {
          return (
            <label className="service-wizard-field is-wide onboarding-question">
              <span>Description</span>
              <textarea
                autoFocus
                value={primaryService.description || ''}
                onChange={(event) => updateService(0, { description: event.target.value })}
                placeholder="What is included, who it is for, and anything clients should know."
                rows={5}
              />
            </label>
          );
        }
        if (serviceQuestionIndex === 5) {
          return (
            <div className="service-media-panel is-wide onboarding-question">
              <div>
                <span>Service photos</span>
                <strong>{primaryService.imageUrls?.length ? `${primaryService.imageUrls.length} image${primaryService.imageUrls.length === 1 ? '' : 's'} added` : 'Add service images'}</strong>
              </div>
              <div className="service-media-grid">
                {(primaryService.imageUrls || []).slice(0, 8).map((url, imageIndex) => (
                  <div key={`${url}-${imageIndex}`} className="service-media-thumb">
                    <img src={url} alt="" />
                    <button type="button" onClick={() => removeServiceImage(0, imageIndex)} aria-label="Remove service image">
                      <X size={13} />
                    </button>
                  </div>
                ))}
                <label className="service-media-add" aria-label="Upload service images">
                  <ImageIcon size={18} />
                  <input type="file" accept="image/*" multiple onChange={(event) => handleServiceImageUpload(0, event)} />
                </label>
              </div>
              <p className="service-media-hint">
                <ImageIcon size={13} />
                <span>First photo becomes the service card image. You can polish the gallery later in Services.</span>
              </p>
            </div>
          );
        }
        return (
          <div className="service-wizard-grid onboarding-service-final-question">
            <label className="service-wizard-field onboarding-question">
              <span>Price</span>
              <div className="service-money-row">
                <input
                  value={primaryService.currency || 'R'}
                  onChange={(event) => updateService(0, { currency: event.target.value })}
                  aria-label="Currency"
                />
                <input
                  value={primaryService.price || ''}
                  onChange={(event) => updateService(0, { price: event.target.value })}
                  placeholder="450"
                  aria-label="Price"
                />
              </div>
            </label>
            <div className="service-wizard-field onboarding-question">
              <span>Duration</span>
              <div className="service-duration-choice-panel">
                <div className="service-duration-grid" role="radiogroup" aria-label="Service duration">
                  {serviceDurationOptions.map(option => (
                    <button
                      key={option.minutes}
                      type="button"
                      role="radio"
                      aria-checked={String(primaryService.duration || '') === option.minutes}
                      className={String(primaryService.duration || '') === option.minutes ? 'is-active' : ''}
                      onClick={() => updateService(0, { duration: option.minutes, durationMode: 'fixed' })}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div className="service-adaptive-note is-wide onboarding-question">
              <DollarSign size={16} />
              <div>
                <strong>{primaryService.name || 'Name your service'}</strong>
                <span>{primaryService.duration || 60} min{primaryService.price ? ` / R${primaryService.price}` : ' / price optional'}</span>
              </div>
            </div>
          </div>
        );
      };

      return (
        <div className="onboarding-focus-page onboarding-service-wizard-panel">
          <div className="onboarding-service-question-shell">
            <div className="service-wizard-step-head onboarding-question">
              <span>Question {serviceQuestionIndex + 1} of {serviceQuestionCount}</span>
              <h3>{serviceQuestionMeta[serviceQuestionIndex][1]}</h3>
              <p>{serviceQuestionMeta[serviceQuestionIndex][0]} for {primaryService.name || 'your first service'}.</p>
            </div>
            <div className="onboarding-service-question-card" key={serviceQuestionIndex}>
              {renderServiceQuestion()}
            </div>
            <div className="onboarding-service-question-actions">
              <button type="button" onClick={goBackServiceQuestion} disabled={serviceQuestionIndex === 0}>Previous setting</button>
              <button type="button" className="is-primary" onClick={goNextServiceQuestion} disabled={serviceQuestionIndex === serviceQuestionCount - 1}>
                Next setting <ArrowRight size={15} />
              </button>
            </div>
          </div>
        </div>
      );
    }

    if (stepId === 'availability') {
      return (
        <div className="onboarding-full-schedule-editor">
          <ScheduleSettingsModal
            applyScope={applyScope}
            availabilityRules={{
              scheduleMode: 'time_slots',
              holdMode: draft.rules.holdMode,
              bookingNotice: draft.rules.bookingNotice,
              cancellationWindow: draft.rules.cancellationWindow,
              reschedulingAllowed: draft.rules.reschedulingAllowed
            }}
            defaultSlots={defaultSlots}
            isOpen
            onAddSlot={startAddingDefaultSlot}
            onApplyDefaults={() => {}}
            onChangeApplyScope={setApplyScope}
            onClose={() => setCurrentStep(4)}
            onDeleteSlot={(slot) => updateDefaultSlots(defaultSlots.filter(time => time !== slot))}
            onDeleteScheduleTemplate={() => {}}
            onEditSlot={startEditingDefaultSlot}
            onApplyScheduleTemplate={applyScheduleTemplate}
            onSaveScheduleTemplate={() => {}}
            onSelectDate={() => {}}
            onUpdateAvailabilityRules={(patch) => updateRules(patch)}
            onSaveAvailabilitySettings={() => setCurrentStep(4)}
            onSaveDefaults={() => updateDefaultSlots(defaultSlots)}
            onToggleWaitlist={() => updateRules({ waitlist: !draft.rules.waitlist })}
            scheduleTemplates={scheduleTemplates}
            selectedDate={selectedDate}
            selectedCalendarName="Business Overview"
            waitlistEnabled={draft.rules.waitlist !== false}
          />
          <ScheduleSlotEditorModal
            deleteSlotFromEditor={deleteScheduleSlotFromEditor}
            saveSlotEditor={saveScheduleSlotEditor}
            setSlotEditor={setScheduleSlotEditor}
            slotEditor={scheduleSlotEditor}
          />
        </div>
      );
    }

    const serviceSummary = selectedServices.filter(service => service?.name?.trim()).slice(0, 3);
    const imageCount = selectedServices.reduce((total, service) => total + (Array.isArray(service.imageUrls) ? service.imageUrls.length : 0), 0);
    const publishCards = [
      {
        title: 'Business identity',
        done: Boolean(draft.brandName),
        detail: draft.brandName || 'Business name still needed',
        meta: [
          preset.label,
          draft.businessEmail || 'No email added',
          draft.tagline || 'No tagline yet'
        ]
      },
      {
        title: 'Services',
        done: hasVisibleService,
        detail: hasVisibleService ? `${serviceSummary.length} starter service${serviceSummary.length === 1 ? '' : 's'} ready` : 'Add one visible service with duration',
        meta: serviceSummary.length
          ? serviceSummary.map(service => `${service.name} - ${formatServiceDuration(service.duration) || 'duration missing'}${formatServicePrice(service) ? ` - ${formatServicePrice(service)}` : ''}`)
          : ['No service ready yet'],
        media: imageCount ? `${imageCount} uploaded service image${imageCount === 1 ? '' : 's'}` : 'No service images yet'
      },
      {
        title: 'Hours',
        done: defaultSlots.length > 0,
        detail: `${defaultSlots.length} bookable time${defaultSlots.length === 1 ? '' : 's'} set`,
        meta: [
          availabilityPresets[draft.availability]?.label || 'Custom schedule',
          defaultSlots.slice(0, 6).join(', ') || 'No slots yet',
          applyScope === 'always' ? 'Reusable default schedule' : 'Temporary schedule scope'
        ]
      },
      {
        title: 'Booking behavior',
        done: true,
        detail: draft.rules.holdMode === 'confirmed' ? 'Bookings reserve time immediately' : 'Requests can be reviewed first',
        meta: [
          `Notice: ${draft.rules.bookingNotice || 'none'}`,
          `Cancellation: ${draft.rules.cancellationWindow || 'none'}`,
          draft.rules.waitlist === false ? 'Waitlist off' : 'Waitlist on'
        ]
      },
      {
        title: 'Client form',
        done: true,
        detail: 'Default form is ready',
        meta: ['Name required', 'Email required', 'Phone optional', 'Notes optional']
      },
      {
        title: 'Recommended after publish',
        done: false,
        detail: 'Not required for launch',
        meta: ['Payments', 'Notifications', 'Google Calendar', 'Team', 'Migration']
      }
    ];

    return (
      <div className="onboarding-publish-summary">
        {publishCards.map(card => (
          <article key={card.title} className={`onboarding-summary-card onboarding-question ${card.done ? 'is-ready' : 'is-next'}`}>
            <span className={card.done ? 'is-done' : ''}>{card.done ? <Check size={15} /> : '!'}</span>
            <div>
              <p>{card.title}</p>
              <strong>{card.detail}</strong>
              <ul>
                {card.meta.filter(Boolean).map(item => <li key={item}>{item}</li>)}
              </ul>
              {card.media && <em>{card.media}</em>}
            </div>
          </article>
        ))}
      </div>
    );
  };

  if (complete) {
    return (
      <main className="business-onboarding-page is-complete native-ui">
        <OnboardingCompleteCard
          bookingPageUrl={bookingPageUrl}
          onCopyLink={onCopyBookingLink}
          onEditPage={onEditBookingPage}
          onOpenDashboard={onOpenDashboard}
        />
      </main>
    );
  }

  return (
    <main className="business-onboarding-page native-ui">
      <header className="onboarding-topbar">
        <strong>Build A Booking</strong>
        <div>
          <span>Step {currentStep + 1} of {steps.length}</span>
          <b>Launch Score {launchScore}%</b>
        </div>
        <button type="button" onClick={onFinishLater}>Save & exit</button>
      </header>
      <OnboardingProgressPath
        currentStep={currentStep}
        onStepSelect={(stepIndex) => setCurrentStep(stepIndex)}
        steps={steps}
        launchScore={launchScore}
      />
      <section className="onboarding-stage">
        <header className="onboarding-stage-header">
          <div>
            <p>Launch Path</p>
            <h1>{steps[currentStep].title}</h1>
            <span>{isGuestWorkspace ? 'Preview the setup flow in demo mode.' : 'Only the essentials required to publish. Styling, forms, payments, calendar, team, and migration can come after.'}</span>
          </div>
          <small>{launchScore}% ready</small>
        </header>
        <div className="onboarding-step-card" aria-live="polite">
          {renderStep()}
        </div>
        {stepId !== 'availability' && (
          <footer className="onboarding-stage-footer">
            <button type="button" onClick={goBack} disabled={currentStep === 0 || saving}>
              <ArrowLeft size={16} /> Back
            </button>
            <div>
              <button type="button" className="is-later" onClick={skipCurrentStep} disabled={saving}>
                I&apos;ll do this later
              </button>
              <button type="button" className="is-primary" onClick={goNext} disabled={!canContinue || saving}>
                {saving ? 'Publishing...' : currentStep === steps.length - 1 ? 'Publish booking page' : 'Continue'}
                {!saving && <ArrowRight size={16} />}
              </button>
            </div>
          </footer>
        )}
      </section>
    </main>
  );
}
