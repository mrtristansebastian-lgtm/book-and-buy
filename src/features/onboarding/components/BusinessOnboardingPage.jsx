import { useMemo, useState } from 'react';
import '../../../styles/features/onboarding/business-onboarding.css';
import {
  ArrowLeft,
  ArrowRight,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  Download,
  MapPin,
  Package,
  X
} from 'lucide-react';
import { OnboardingCompleteCard } from './OnboardingCompleteCard';
import { OnboardingProgressPath } from './OnboardingProgressPath';
import { BuildABookingBrand } from '../../../components/BuildABookingBrand';
import { GooglePlaceAutocompleteInput } from '../../maps/GooglePlaceAutocompleteInput';
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
  { id: 'personal', number: '01', title: 'Personal Details', short: 'Your contact' },
  { id: 'business', number: '02', title: 'Business Type', short: 'Pick your lane' },
  { id: 'welcome', number: '03', title: 'Details', short: 'Name & contact' },
  { id: 'services', number: '04', title: 'Services', short: 'Visible service' },
  { id: 'availability', number: '05', title: 'Schedule', short: 'Bookable times' },
  { id: 'preview', number: '06', title: 'Publish', short: 'Readiness check' }
];

const normalizeEmail = (email = '') => String(email || '').trim().toLowerCase();

const splitDisplayName = (displayName = '') => {
  const parts = String(displayName || '').trim().split(/\s+/).filter(Boolean);
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ')
  };
};

const stripeSupportedCountries = [
  ['AU', 'Australia', '+61'],
  ['AT', 'Austria', '+43'],
  ['BE', 'Belgium', '+32'],
  ['BR', 'Brazil', '+55'],
  ['BG', 'Bulgaria', '+359'],
  ['CA', 'Canada', '+1'],
  ['CI', "Cote d'Ivoire", '+225'],
  ['HR', 'Croatia', '+385'],
  ['CY', 'Cyprus', '+357'],
  ['CZ', 'Czech Republic', '+420'],
  ['DK', 'Denmark', '+45'],
  ['EE', 'Estonia', '+372'],
  ['FI', 'Finland', '+358'],
  ['FR', 'France', '+33'],
  ['DE', 'Germany', '+49'],
  ['GH', 'Ghana', '+233'],
  ['GI', 'Gibraltar', '+350'],
  ['GR', 'Greece', '+30'],
  ['HK', 'Hong Kong', '+852'],
  ['HU', 'Hungary', '+36'],
  ['IN', 'India', '+91'],
  ['ID', 'Indonesia', '+62'],
  ['IE', 'Ireland', '+353'],
  ['IT', 'Italy', '+39'],
  ['JP', 'Japan', '+81'],
  ['KE', 'Kenya', '+254'],
  ['LV', 'Latvia', '+371'],
  ['LI', 'Liechtenstein', '+423'],
  ['LT', 'Lithuania', '+370'],
  ['LU', 'Luxembourg', '+352'],
  ['MY', 'Malaysia', '+60'],
  ['MT', 'Malta', '+356'],
  ['MX', 'Mexico', '+52'],
  ['NL', 'Netherlands', '+31'],
  ['NZ', 'New Zealand', '+64'],
  ['NG', 'Nigeria', '+234'],
  ['NO', 'Norway', '+47'],
  ['PL', 'Poland', '+48'],
  ['PT', 'Portugal', '+351'],
  ['RO', 'Romania', '+40'],
  ['SG', 'Singapore', '+65'],
  ['SK', 'Slovakia', '+421'],
  ['SI', 'Slovenia', '+386'],
  ['ZA', 'South Africa', '+27'],
  ['ES', 'Spain', '+34'],
  ['SE', 'Sweden', '+46'],
  ['CH', 'Switzerland', '+41'],
  ['TH', 'Thailand', '+66'],
  ['AE', 'United Arab Emirates', '+971'],
  ['GB', 'United Kingdom', '+44'],
  ['US', 'United States', '+1']
].map(([code, name, dialCode]) => ({ code, name, dialCode }));

const getCountryFlagUrl = (countryCode = 'ZA') => (
  `https://flagcdn.com/w40/${String(countryCode || 'ZA').toLowerCase()}.png`
);

const FlagImage = ({ code, name }) => (
  <img
    src={getCountryFlagUrl(code)}
    alt=""
    aria-hidden="true"
    loading="lazy"
  />
);

const findCountryByCode = (countryCode = 'ZA') => (
  stripeSupportedCountries.find(country => country.code === countryCode) || stripeSupportedCountries.find(country => country.code === 'ZA')
);

const findCountryByName = (countryName = '') => (
  stripeSupportedCountries.find(country => country.name === countryName)
);

const parsePhoneParts = (rawPhone = '') => {
  const phone = String(rawPhone || '').trim();
  const matchedCountry = [...stripeSupportedCountries]
    .sort((first, second) => second.dialCode.length - first.dialCode.length)
    .find(country => phone.startsWith(country.dialCode));
  if (!matchedCountry) {
    const fallbackCountry = findCountryByCode('ZA');
    return {
      countryCode: fallbackCountry.code,
      dialCode: fallbackCountry.dialCode,
      number: phone
    };
  }
  return {
    countryCode: matchedCountry.code,
    dialCode: matchedCountry.dialCode,
    number: phone.slice(matchedCountry.dialCode.length).trim()
  };
};

const combinePhoneParts = (dialCode = '', phoneNumber = '') => (
  [dialCode, phoneNumber].filter(Boolean).join(' ').trim()
);

const industryIcons = {
  salon: '💇',
  fitness: '🏋️',
  rentals: '🛍️',
  classes: '🎓',
  barber: '💈',
  spa: '🧖',
  nails: '💅',
  tutor: '📚',
  childcare: '🧸',
  venue: '🏛️',
  photography: '📸',
  musicstudio: '🎧',
  events: '🎉',
  restaurant: '🍽️',
  accommodation: '🏨',
  cleaning: '🧼',
  trades: '🧰',
  automotive: '🚗',
  petcare: '🐾',
  consulting: '💼',
  realestate: '🏡',
  creative: '🎨',
  nonprofit: '📣',
  custom: '✨'
};

const serviceDurationOptions = [
  { label: '15 min', minutes: '15' },
  { label: '30 min', minutes: '30' },
  { label: '45 min', minutes: '45' },
  { label: '60 min', minutes: '60' },
  { label: '90 min', minutes: '90' },
  { label: '120 min', minutes: '120' }
];

const servicePriceTypeOptions = [
  { id: 'fixed', label: 'Fixed', helper: 'One set price' },
  { id: 'from', label: 'From', helper: 'Starts at this price' },
  { id: 'hourly', label: 'Hourly', helper: 'Price per hour' },
  { id: 'quote', label: 'Quote', helper: 'Confirm after request' }
];

const commerceTypeOptions = [
  {
    id: 'bookable_service',
    label: 'Bookable service',
    description: 'Appointments, sessions, rentals, classes, consultations, or time slots.',
    icon: <CalendarDays size={22} />
  },
  {
    id: 'physical_product',
    label: 'Physical product',
    description: 'Items clients buy, collect, receive, or add alongside a booking.',
    icon: <Package size={22} />
  },
  {
    id: 'digital_product',
    label: 'Downloadable digital product',
    description: 'Files, guides, templates, courses, or digital resources.',
    icon: <Download size={22} />
  }
];

export function BusinessOnboardingPage({
  bookingPageUrl,
  isGuestWorkspace,
  onApply,
  onCopyBookingLink,
  onEditBookingPage,
  onFinishLater,
  onOpenDashboard,
  personalProfile,
  settings,
  user
}) {
  const [currentStep, setCurrentStep] = useState(0);
  const [complete, setComplete] = useState(false);
  const [saving, setSaving] = useState(false);
  const [applyScope, setApplyScope] = useState('always');
  const [scheduleSlotEditor, setScheduleSlotEditor] = useState(null);
  const [activeServiceIndex, setActiveServiceIndex] = useState(0);
  const [activeServiceSetupGroup, setActiveServiceSetupGroup] = useState('basics');
  const [serviceSaved, setServiceSaved] = useState(false);
  const [industryMenuOpen, setIndustryMenuOpen] = useState(true);
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState('');
  const [phoneCodeMenuOpen, setPhoneCodeMenuOpen] = useState(false);
  const [phoneCodeQuery, setPhoneCodeQuery] = useState('');
  const [draft, setDraft] = useState(() => {
    const initialPhone = personalProfile?.mobile || personalProfile?.phone || user?.phoneNumber || '';
    const phoneParts = parsePhoneParts(initialPhone);
    const initialCountry = personalProfile?.country || findCountryByCode(phoneParts.countryCode)?.name || '';
    return {
      personalProfileKey: user?.uid || normalizeEmail(user?.email || '') || (isGuestWorkspace ? 'guest-workspace' : 'local-account'),
      personalUid: user?.uid || personalProfile?.uid || '',
      personalFirstName: personalProfile?.firstName || splitDisplayName(user?.displayName).firstName,
      personalLastName: personalProfile?.lastName || splitDisplayName(user?.displayName).lastName,
      personalEmail: personalProfile?.email || user?.email || '',
      personalPhoneCountryCode: phoneParts.countryCode,
      personalPhoneDialCode: phoneParts.dialCode,
      personalPhoneNumber: phoneParts.number,
      personalPhone: combinePhoneParts(phoneParts.dialCode, phoneParts.number),
      personalCountry: initialCountry,
      industry: settings.serviceIndustry || 'salon',
      brandName: settings.brandName && settings.brandName !== 'Your Business' ? settings.brandName : '',
      tagline: settings.tagline || '',
      businessDescription: settings.businessDescription || settings.welcomeMessage || '',
      businessEmail: settings.businessEmail || user?.email || '',
      venuePhotos: Array.isArray(settings.venuePhotos) ? settings.venuePhotos : [],
      address: settings.address || '',
      mapPlace: settings.mapPlace || null,
      accent: settings.primaryColor || '#16A34A',
      commerceTypes: settings.commerceTypes || ['bookable_service'],
      availability: 'weekdays',
      locationMode: 'my_location',
      services: Array.isArray(settings.services) ? settings.services : [],
      rules: {
        scheduleMode: 'time_slots',
        bookingNotice: '24h',
        cancellationWindow: '24h',
        holdMode: 'pending_confirmed',
        waitlist: true,
        reschedulingAllowed: true
      }
    };
  });
  const [businessTypeQuery, setBusinessTypeQuery] = useState('');

  const preset = createIndustryPreset(draft.industry);
  const selectedServices = Array.isArray(draft.services) ? draft.services : [];
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
  const visibleCountries = useMemo(() => {
    const query = countryQuery.trim().toLowerCase();
    const selectedName = String(draft.personalCountry || '').trim().toLowerCase();
    const rankedCountries = [...stripeSupportedCountries].sort((first, second) => {
      if (first.name.toLowerCase() === selectedName) return -1;
      if (second.name.toLowerCase() === selectedName) return 1;
      return first.name.localeCompare(second.name);
    });
    if (!query) return rankedCountries;
    return rankedCountries.filter(country => (
      country.name.toLowerCase().includes(query)
      || country.code.toLowerCase().includes(query)
    ));
  }, [countryQuery, draft.personalCountry]);
  const visiblePhoneCountries = useMemo(() => {
    const query = phoneCodeQuery.trim().toLowerCase();
    const selectedCode = String(draft.personalPhoneCountryCode || '').trim().toUpperCase();
    const rankedCountries = [...stripeSupportedCountries].sort((first, second) => {
      if (first.code === selectedCode) return -1;
      if (second.code === selectedCode) return 1;
      return first.name.localeCompare(second.name);
    });
    if (!query) return rankedCountries;
    return rankedCountries.filter(country => (
      country.name.toLowerCase().includes(query)
      || country.code.toLowerCase().includes(query)
      || country.dialCode.includes(query)
    ));
  }, [draft.personalPhoneCountryCode, phoneCodeQuery]);
  const selectedCountry = findCountryByName(draft.personalCountry) || findCountryByCode('ZA');
  const selectedPhoneCountry = findCountryByCode(draft.personalPhoneCountryCode || selectedCountry.code);
  const stepId = steps[currentStep].id;
  const launchScore = complete ? 100 : Math.round(((currentStep + 1) / steps.length) * 100);
  const hasVisibleService = selectedServices.some(service => service?.name?.trim() && String(service.duration || '').trim());
  const hasPersonalDetails = Boolean(
    (draft.personalFirstName || '').trim()
    && (draft.personalLastName || '').trim()
    && (draft.personalEmail || '').trim()
    && (draft.personalPhoneNumber || '').trim()
    && (draft.personalCountry || '').trim()
  );
  const canContinue = useMemo(() => {
    if (stepId === 'personal') return hasPersonalDetails;
    if (stepId === 'welcome') return Boolean((draft.brandName || '').trim());
    if (stepId === 'services') return hasVisibleService;
    return true;
  }, [draft.brandName, hasPersonalDetails, hasVisibleService, stepId]);

  const updateDraft = (patch) => setDraft(prev => ({ ...prev, ...patch }));
  const updateRules = (patch) => setDraft(prev => ({ ...prev, rules: { ...prev.rules, ...patch } }));
  const updateDefaultSlots = (slots) => updateDraft({ defaultSlots: sortSlotValues(slots) });
  const selectPersonalCountry = (country) => {
    updateDraft({
      personalCountry: country.name,
      personalPhoneCountryCode: country.code,
      personalPhoneDialCode: country.dialCode,
      personalPhone: combinePhoneParts(country.dialCode, draft.personalPhoneNumber)
    });
    setCountryQuery('');
    setCountryMenuOpen(false);
  };
  const selectPhoneCountry = (country) => {
    updateDraft({
      personalPhoneCountryCode: country.code,
      personalPhoneDialCode: country.dialCode,
      personalPhone: combinePhoneParts(country.dialCode, draft.personalPhoneNumber)
    });
    setPhoneCodeQuery('');
    setPhoneCodeMenuOpen(false);
  };
  const updatePersonalPhoneNumber = (phoneNumber) => {
    updateDraft({
      personalPhoneNumber: phoneNumber,
      personalPhone: combinePhoneParts(draft.personalPhoneDialCode, phoneNumber)
    });
  };
  const toggleCommerceType = (typeId) => {
    const currentTypes = Array.isArray(draft.commerceTypes) ? draft.commerceTypes : [];
    const nextTypes = currentTypes.includes(typeId)
      ? currentTypes.filter(id => id !== typeId)
      : [...currentTypes, typeId];
    updateDraft({ commerceTypes: nextTypes.length ? nextTypes : [typeId] });
  };

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
  const finishLater = () => {
    if (!saving) onFinishLater?.();
  };

  const chooseBusinessType = (id, option) => {
    setActiveServiceIndex(0);
    setServiceSaved(false);
    setBusinessTypeQuery('');
    updateDraft({
      industry: id,
      accent: option.accent,
      tagline: option.tagline
    });
  };

  const updateService = (index, patch) => {
    const fallbackService = {
      id: `launch-service-${Date.now()}`,
      name: '',
      category: preset.label,
      description: '',
      duration: '60',
      durationMode: 'fixed',
      currency: 'R',
      price: '',
      priceType: 'fixed',
      active: true,
      imageUrls: []
    };
    const sourceServices = selectedServices.length ? selectedServices : [fallbackService];
    const next = sourceServices.map((service, serviceIndex) => (
      serviceIndex === index ? { ...service, ...patch } : service
    ));
    setServiceSaved(false);
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

  const handleBusinessPhotoUpload = async (event) => {
    const files = Array.from(event.target.files || []).filter(Boolean);
    if (!files.length) return;
    const imageUrls = (await Promise.all(files.map(readImageFileAsDataUrl))).filter(Boolean);
    updateDraft({ venuePhotos: [...(draft.venuePhotos || []), ...imageUrls].slice(0, 8) });
    event.target.value = '';
  };

  const removeBusinessPhoto = (imageIndex) => {
    updateDraft({
      venuePhotos: (draft.venuePhotos || []).filter((_, index) => index !== imageIndex)
    });
  };

  const handleAddressChange = (value) => {
    updateDraft({
      address: value,
      mapPlace: draft.mapPlace ? null : draft.mapPlace
    });
  };

  const handlePlaceSelect = (mapPlace) => {
    const readableAddress = mapPlace?.formattedAddress || mapPlace?.displayName || draft.address || '';
    updateDraft({ address: readableAddress, mapPlace });
  };

  const handleLocationClear = () => updateDraft({ address: '', mapPlace: null });

  const editingServiceIndex = Math.min(activeServiceIndex, Math.max(selectedServices.length - 1, 0));
  const primaryService = selectedServices[editingServiceIndex] || {
    id: 'launch-service-draft',
    name: '',
    category: preset.label,
    description: '',
    duration: '60',
    durationMode: 'fixed',
    currency: 'R',
    price: '',
    priceType: 'fixed',
    active: true,
    imageUrls: []
  };
  const primaryServiceDuration = String(primaryService.duration || '60');
  const isNoFixedDuration = primaryService.durationMode === 'none';
  const primaryServicePriceType = primaryService.priceType || 'fixed';
  const isCustomDuration = !isNoFixedDuration && (
    primaryService.durationMode === 'custom'
    || !serviceDurationOptions.some(option => option.minutes === primaryServiceDuration)
  );
  const saveCurrentService = () => setServiceSaved(true);
  const createAnotherService = () => {
    const nextServices = [
      ...selectedServices,
      {
        id: `launch-service-${Date.now()}`,
        name: '',
        category: preset.label,
        description: '',
        duration: '60',
        durationMode: 'fixed',
        currency: 'R',
        price: '',
        priceType: 'fixed',
        active: true,
        imageUrls: []
      }
    ];
    updateDraft({ services: nextServices });
    setActiveServiceIndex(nextServices.length - 1);
    setServiceSaved(false);
  };
  const selectedDate = new Date().toISOString().slice(0, 10);
  const scheduleTemplates = useMemo(() => [], []);

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
  };

  const renderPersonalFields = () => (
    <div className="onboarding-form-card onboarding-personal-form-card">
      <label className="onboarding-question">
        <span>First name</span>
        <input
          autoFocus
          value={draft.personalFirstName}
          onChange={(event) => updateDraft({ personalFirstName: event.target.value })}
          placeholder="Tristan"
          autoComplete="given-name"
        />
      </label>
      <label className="onboarding-question">
        <span>Surname</span>
        <input
          value={draft.personalLastName}
          onChange={(event) => updateDraft({ personalLastName: event.target.value })}
          placeholder="Damon"
          autoComplete="family-name"
        />
      </label>
      <label className="onboarding-question">
        <span>Email</span>
        <input
          type="email"
          value={draft.personalEmail}
          onChange={(event) => updateDraft({ personalEmail: event.target.value })}
          placeholder="you@example.com"
          autoComplete="email"
        />
      </label>
      <label className="onboarding-question onboarding-personal-country-field">
        <span>Country</span>
        <div className={`onboarding-country-combobox ${countryMenuOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="onboarding-country-trigger"
            onClick={() => {
              setCountryMenuOpen(open => !open);
              setCountryQuery('');
            }}
            aria-expanded={countryMenuOpen}
            aria-controls="onboarding-country-list"
          >
            <span className="onboarding-flag" aria-hidden="true">
              <FlagImage code={selectedCountry.code} name={selectedCountry.name} />
            </span>
            <strong>{draft.personalCountry || 'Choose country'}</strong>
            <em>{draft.personalCountry ? 'Selected' : 'Stripe-supported list'}</em>
            <ChevronDown size={18} aria-hidden="true" />
          </button>
          {countryMenuOpen && (
            <div className="onboarding-country-menu" id="onboarding-country-list">
              <input
                value={countryQuery}
                onChange={(event) => setCountryQuery(event.target.value)}
                placeholder="Search country..."
                autoComplete="off"
                autoFocus
              />
              <div className="onboarding-country-options" role="listbox" aria-label="Countries Stripe supports">
                {visibleCountries.length ? (
                  visibleCountries.map(country => {
                    const selected = draft.personalCountry === country.name;
                    return (
                      <button
                        key={country.code}
                        type="button"
                        className={selected ? 'is-active' : ''}
                        onClick={() => selectPersonalCountry(country)}
                        role="option"
                        aria-selected={selected}
                      >
                        <span className="onboarding-flag" aria-hidden="true">
                          <FlagImage code={country.code} name={country.name} />
                        </span>
                        <strong>{country.name}</strong>
                        <small>{country.code}</small>
                        {selected && <em>Selected</em>}
                      </button>
                    );
                  })
                ) : (
                  <p>No country found in the supported list.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </label>
      <label className={`onboarding-question onboarding-phone-field ${phoneCodeMenuOpen ? 'is-phone-code-open' : ''}`}>
        <span>Phone number</span>
        <div className="onboarding-phone-number-control">
          <div className={`onboarding-phone-code-combobox ${phoneCodeMenuOpen ? 'is-open' : ''}`}>
            <button
              type="button"
              className="onboarding-phone-code-trigger"
              onClick={() => {
                setPhoneCodeMenuOpen(open => !open);
                setPhoneCodeQuery('');
              }}
              aria-expanded={phoneCodeMenuOpen}
              aria-controls="onboarding-phone-code-list"
            >
              <span className="onboarding-flag" aria-hidden="true">
                <FlagImage code={selectedPhoneCountry.code} name={selectedPhoneCountry.name} />
              </span>
              <strong>{selectedPhoneCountry.dialCode}</strong>
              <ChevronDown size={15} aria-hidden="true" />
            </button>
            {phoneCodeMenuOpen && (
              <div className="onboarding-country-menu onboarding-phone-code-menu" id="onboarding-phone-code-list">
                <input
                  value={phoneCodeQuery}
                  onChange={(event) => setPhoneCodeQuery(event.target.value)}
                  placeholder="Search code or country..."
                  autoComplete="off"
                  autoFocus
                />
                <div className="onboarding-country-options onboarding-phone-code-options" role="listbox" aria-label="Phone country codes">
                  {visiblePhoneCountries.length ? (
                    visiblePhoneCountries.map(country => {
                      const selected = draft.personalPhoneCountryCode === country.code;
                      return (
                        <button
                          key={country.code}
                          type="button"
                          className={selected ? 'is-active' : ''}
                          onClick={() => selectPhoneCountry(country)}
                          role="option"
                          aria-selected={selected}
                        >
                          <span className="onboarding-flag" aria-hidden="true">
                            <FlagImage code={country.code} name={country.name} />
                          </span>
                          <strong>{country.name}</strong>
                          <small>{country.dialCode}</small>
                          {selected && <em>Selected</em>}
                        </button>
                      );
                    })
                  ) : (
                    <p>No phone code found.</p>
                  )}
                </div>
              </div>
            )}
          </div>
          <input
            type="tel"
            value={draft.personalPhoneNumber}
            onChange={(event) => updatePersonalPhoneNumber(event.target.value)}
            placeholder="72 000 0000"
            autoComplete="tel-national"
          />
        </div>
      </label>
    </div>
  );

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
        <span>Slogan optional</span>
        <input
          value={draft.tagline}
          onChange={(event) => updateDraft({ tagline: event.target.value })}
          placeholder={preset.tagline || 'Online bookings made simple'}
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
      <div className="onboarding-business-photo-panel onboarding-question">
        <div>
          <span>Business photos</span>
          <strong>{draft.venuePhotos?.length ? `${draft.venuePhotos.length} photo${draft.venuePhotos.length === 1 ? '' : 's'} added` : 'Optional gallery'}</strong>
        </div>
        <div className="onboarding-business-photo-grid">
          {(draft.venuePhotos || []).slice(0, 8).map((url, imageIndex) => (
            <div key={`${url}-${imageIndex}`} className="onboarding-business-photo-thumb">
              <img src={url} alt="" />
              <button type="button" onClick={() => removeBusinessPhoto(imageIndex)} aria-label="Remove business photo">
                <X size={13} />
              </button>
            </div>
          ))}
          <label className="onboarding-business-photo-add" aria-label="Upload business photos">
            <span aria-hidden="true">+</span>
            <input type="file" accept="image/*" multiple onChange={handleBusinessPhotoUpload} />
          </label>
        </div>
        <p>Add your space, studio, work area, or business vibe. You can edit these later.</p>
      </div>
      <div className="onboarding-business-location-panel onboarding-question">
        <div className="onboarding-business-location-head">
          <span className="onboarding-choice-icon" aria-hidden="true"><MapPin size={18} /></span>
          <div>
            <span>Business location</span>
            <strong>{draft.mapPlace?.placeId || draft.mapPlace?.lat != null ? 'Google place saved' : 'Address for clients'}</strong>
          </div>
        </div>
        <GooglePlaceAutocompleteInput
          value={draft.address || ''}
          onValueChange={handleAddressChange}
          onPlaceSelect={handlePlaceSelect}
          onClear={handleLocationClear}
          className="onboarding-business-location-input"
          placeholder="Search your business address"
        />
        <p>{draft.mapPlace?.placeId || draft.mapPlace?.lat != null ? 'Exact map details will be used on the booking page.' : 'Clients will see this as your location. You can refine the map later.'}</p>
      </div>
    </div>
  );

  const renderSectionHeader = ({ title, description }) => (
    <div className="onboarding-section-head onboarding-question">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );

  const renderStep = () => {
    if (stepId === 'personal') {
      return (
        <div className="onboarding-start-fields onboarding-personal-step">
          {renderSectionHeader({
            title: 'Tell us who owns this workspace.',
            description: 'These details keep your account, support, and team records clean before we set up the business.'
          })}
          {renderPersonalFields()}
        </div>
      );
    }

    if (stepId === 'welcome') {
      return (
        <div className="onboarding-start-fields">
          {renderSectionHeader({
            title: 'Name the business clients will book with.',
            description: 'Add the basics once. We will use them on your public booking page.'
          })}
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
                <h2>What do you sell?</h2>
                <p>Choose what your business offers, then pick the closest industry so we can shape the setup around your work.</p>
              </div>
            </div>
            <section className="onboarding-commerce-step onboarding-question" aria-label="What this business sells">
              <div className="onboarding-commerce-grid">
                {commerceTypeOptions.map(option => {
                  const selected = (draft.commerceTypes || []).includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      className={selected ? 'is-active' : ''}
                      onClick={() => toggleCommerceType(option.id)}
                      aria-pressed={selected}
                    >
                      <span className="onboarding-choice-icon" aria-hidden="true">{option.icon}</span>
                      <strong>{option.label}</strong>
                      <small>{option.description}</small>
                      <em>{selected ? 'Selected' : 'Select'}</em>
                    </button>
                  );
                })}
              </div>
            </section>
            <section className="onboarding-industry-step onboarding-question" aria-label="Choose industry">
              <div className="onboarding-industry-tile-head">
                <span>Industry</span>
                <strong>{preset.label}</strong>
                <small>Pick the closest match. Services are created by you in the next step.</small>
              </div>
              <button
                type="button"
                className={`onboarding-industry-select ${industryMenuOpen ? 'is-open' : ''}`}
                onClick={() => setIndustryMenuOpen(open => !open)}
                aria-expanded={industryMenuOpen}
                aria-controls="onboarding-industry-menu"
              >
                <span className="onboarding-choice-icon" aria-hidden="true">{industryIcons[draft.industry] || '✨'}</span>
                <span>
                  <small>Selected industry</small>
                  <strong>{preset.label}</strong>
                  <em>Services are created by you</em>
                </span>
                <ChevronDown size={18} aria-hidden="true" />
              </button>
              {industryMenuOpen && (
                <div id="onboarding-industry-menu" className="onboarding-industry-menu">
                  <label className="onboarding-industry-filter">
                    <span className="sr-only">Filter industries</span>
                    <input
                      value={businessTypeQuery}
                      onChange={(event) => setBusinessTypeQuery(event.target.value)}
                      placeholder="Search salon, tutor, rental, studio..."
                    />
                  </label>
                  <div className="onboarding-type-list" role="listbox" aria-label="Business types">
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
                          <span className="onboarding-choice-icon" aria-hidden="true">{industryIcons[id] || '✨'}</span>
                          <span>
                            <strong>{option.label}</strong>
                          </span>
                          {draft.industry === id && <em>Selected</em>}
                        </button>
                      ))
                    ) : (
                      <p className="onboarding-type-empty">No exact match yet. Choose "Something else" or try a broader word like class, rental, beauty, home, or creative.</p>
                    )}
                  </div>
                </div>
              )}
            </section>
          </section>
        </div>
      );
    }

    if (stepId === 'services') {
      const serviceSetupGroups = [
        {
          id: 'basics',
          number: '01',
          title: 'Basics',
          description: 'Name, category, and location',
          complete: Boolean(primaryService.name?.trim())
        },
        {
          id: 'pricing',
          number: '02',
          title: 'Pricing',
          description: 'Price and duration',
          complete: primaryServicePriceType === 'quote' || Boolean(primaryService.price || primaryService.durationMode === 'none' || primaryServiceDuration)
        },
        {
          id: 'details',
          number: '03',
          title: 'Details',
          description: 'Client-facing description',
          complete: Boolean(primaryService.description?.trim())
        },
        {
          id: 'media',
          number: '04',
          title: 'Photos & save',
          description: 'Images and launch status',
          complete: serviceSaved
        }
      ];
      const activeServiceGroup = serviceSetupGroups.find(group => group.id === activeServiceSetupGroup) || serviceSetupGroups[0];

      return (
        <div className="onboarding-focus-page onboarding-service-wizard-panel">
          {renderSectionHeader({
            title: 'Set up the service clients will book.',
            description: 'Keep this simple for launch. You can add more services and advanced settings later.'
          })}
          <div className="service-wizard-grid onboarding-service-compact-grid onboarding-service-tabbed-flow">
            <div className="service-setup-step-list" role="tablist" aria-label="Service setup sections">
              {serviceSetupGroups.map(group => {
                const selected = activeServiceGroup.id === group.id;
                return (
                  <button
                    key={group.id}
                    type="button"
                    className={`${selected ? 'is-active' : ''} ${group.complete ? 'is-complete' : ''}`}
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveServiceSetupGroup(group.id)}
                  >
                    <span>{group.complete ? <Check size={13} /> : group.number}</span>
                    <strong>{group.title}</strong>
                    <small>{group.description}</small>
                  </button>
                );
              })}
            </div>

            <div className="service-setup-panel" role="tabpanel" aria-label={activeServiceGroup.title}>
              {activeServiceGroup.id === 'basics' && (
                <div className="service-setup-panel-grid is-basics">
                  <label className="service-wizard-field service-main-field onboarding-question">
                    <span>Service name</span>
                    <input
                      autoFocus
                      value={primaryService.name}
                      onChange={(event) => updateService(editingServiceIndex, { name: event.target.value })}
                      placeholder="Signature Appointment"
                    />
                  </label>
                  <label className="service-wizard-field service-category-field onboarding-question">
                    <span>Category</span>
                    <input
                      value={primaryService.category || preset.label}
                      onChange={(event) => updateService(editingServiceIndex, { category: event.target.value })}
                      placeholder="Beauty, consulting, tutoring..."
                    />
                  </label>
                  <div className="service-wizard-field service-location-field onboarding-question">
                    <span>Where is this service done?</span>
                    <div className="service-location-grid">
                      {[
                        ['online', 'Online', 'Video or remote session'],
                        ['my_location', 'At my location', 'Clients come to you'],
                        ['mobile', 'I travel', 'You go to clients']
                      ].map(([id, label, helper]) => (
                        <button
                          key={id}
                          type="button"
                          className={draft.locationMode === id ? 'is-active' : ''}
                          onClick={() => updateDraft({ locationMode: id })}
                          aria-pressed={draft.locationMode === id}
                        >
                          <span>{draft.locationMode === id ? <Check size={15} /> : null}</span>
                          <strong>{label}</strong>
                          <small>{helper}</small>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {activeServiceGroup.id === 'pricing' && (
                <div className="service-setup-panel-grid is-pricing">
                  <div className="service-wizard-field service-price-field onboarding-question">
                    <span>Price</span>
                    <div className="service-price-mode-grid" role="radiogroup" aria-label="Service pricing type">
                      {servicePriceTypeOptions.map(option => {
                        const selected = primaryServicePriceType === option.id;
                        return (
                          <button
                            key={option.id}
                            type="button"
                            className={selected ? 'is-active' : ''}
                            onClick={() => updateService(editingServiceIndex, {
                              priceType: option.id,
                              price: option.id === 'quote' ? '' : primaryService.price
                            })}
                            aria-pressed={selected}
                          >
                            <span>{selected ? <Check size={13} /> : null}</span>
                            <strong>{option.label}</strong>
                            <small>{option.helper}</small>
                          </button>
                        );
                      })}
                    </div>
                    <div className="service-money-row">
                      <input
                        value={primaryService.currency || 'R'}
                        onChange={(event) => updateService(editingServiceIndex, { currency: event.target.value })}
                        aria-label="Currency"
                        disabled={primaryServicePriceType === 'quote'}
                      />
                      <input
                        value={primaryService.price || ''}
                        onChange={(event) => updateService(editingServiceIndex, { price: event.target.value })}
                        placeholder={primaryServicePriceType === 'hourly' ? '450 per hour' : primaryServicePriceType === 'from' ? '450 starting price' : '450'}
                        aria-label="Price"
                        disabled={primaryServicePriceType === 'quote'}
                      />
                    </div>
                    <small>{primaryServicePriceType === 'quote' ? 'No amount needed. Clients will request this service and you can quote them after.' : 'Use numbers only here. The booking page will format it for clients.'}</small>
                  </div>
                  <div className="service-wizard-field service-duration-field onboarding-question">
                    <span>Duration</span>
                    <div className="service-duration-choice-panel">
                      <select
                        aria-label="Service duration"
                        value={primaryService.durationMode === 'none' ? '' : isCustomDuration ? 'custom' : primaryServiceDuration}
                        disabled={primaryService.durationMode === 'none'}
                        onChange={(event) => {
                          if (event.target.value === 'custom') {
                            updateService(editingServiceIndex, { durationMode: 'custom', duration: primaryServiceDuration || '60' });
                            return;
                          }
                          updateService(editingServiceIndex, { duration: event.target.value, durationMode: 'fixed' });
                        }}
                      >
                        <option value="">No fixed duration</option>
                        {serviceDurationOptions.map(option => (
                          <option
                            key={option.minutes}
                            value={option.minutes}
                          >
                            {option.label}
                          </option>
                        ))}
                        <option value="custom">Custom duration</option>
                      </select>
                      <label className={`service-no-duration ${primaryService.durationMode === 'none' ? 'is-active' : ''}`}>
                        <input
                          type="checkbox"
                          checked={primaryService.durationMode === 'none'}
                          onChange={(event) => updateService(editingServiceIndex, {
                            durationMode: event.target.checked ? 'none' : 'fixed',
                            duration: event.target.checked ? '' : (primaryServiceDuration || '60')
                          })}
                        />
                        <span>{primaryService.durationMode === 'none' ? <Check size={13} /> : null}</span>
                        <strong>No fixed duration</strong>
                      </label>
                      {isCustomDuration && (
                        <label className="service-custom-duration">
                          <span>Custom minutes</span>
                          <input
                            type="number"
                            min="5"
                            step="5"
                            value={primaryServiceDuration}
                            onChange={(event) => updateService(editingServiceIndex, { duration: event.target.value, durationMode: 'custom' })}
                            placeholder="75"
                          />
                        </label>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {activeServiceGroup.id === 'details' && (
                <label className="service-wizard-field service-description-field onboarding-question">
                  <span>Description</span>
                  <textarea
                    value={primaryService.description || ''}
                    onChange={(event) => updateService(editingServiceIndex, { description: event.target.value })}
                    placeholder="What is included, who it is for, and anything clients should know."
                    rows={7}
                  />
                </label>
              )}

              {activeServiceGroup.id === 'media' && (
                <div className="service-setup-panel-grid is-media">
                  <div className="service-media-panel service-photos-field onboarding-question">
                    <div>
                      <span>Service photos</span>
                      <strong>{primaryService.imageUrls?.length ? `${primaryService.imageUrls.length} image${primaryService.imageUrls.length === 1 ? '' : 's'} added` : 'Optional photos'}</strong>
                    </div>
                    <div className="service-media-grid">
                      {(primaryService.imageUrls || []).slice(0, 8).map((url, imageIndex) => (
                        <div key={`${url}-${imageIndex}`} className="service-media-thumb">
                          <img src={url} alt="" />
                          <button type="button" onClick={() => removeServiceImage(editingServiceIndex, imageIndex)} aria-label="Remove service image">
                            <X size={13} />
                          </button>
                        </div>
                      ))}
                      <label className="service-media-add" aria-label="Upload service images">
                        <span aria-hidden="true">+</span>
                        <input type="file" accept="image/*" multiple onChange={(event) => handleServiceImageUpload(editingServiceIndex, event)} />
                      </label>
                    </div>
                    <p className="service-media-hint">
                      <span>First photo becomes the card image. This is optional for launch.</span>
                    </p>
                  </div>
                  <div className={`service-save-panel onboarding-question ${serviceSaved ? 'is-saved' : ''}`}>
                    <div>
                      <span>{serviceSaved ? 'Service saved' : 'Ready to save'}</span>
                      <strong>{serviceSaved ? `${primaryService.name || 'Service'} is ready for launch.` : 'Save this service, then create another if you need one.'}</strong>
                      <p>You can always add more services later in the Services section.</p>
                    </div>
                    <button type="button" className="service-save-button" onClick={saveCurrentService}>
                      {serviceSaved ? <Check size={15} /> : null}
                      {serviceSaved ? 'Saved' : 'Save this service'}
                    </button>
                    {serviceSaved && (
                      <button type="button" className="service-create-another-button" onClick={createAnotherService}>
                        Create another one
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (stepId === 'availability') {
      return (
        <div className="onboarding-focus-page onboarding-schedule-panel">
          {renderSectionHeader({
            title: 'Set the times clients can book.',
            description: 'Use the same schedule setup from the app, focused here for launch.'
          })}
          <div className="onboarding-full-schedule-editor">
            <ScheduleSettingsModal
              applyScope={applyScope}
              availabilityRules={{
                scheduleMode: draft.rules.scheduleMode,
                holdMode: draft.rules.holdMode,
                bookingNotice: draft.rules.bookingNotice,
                cancellationWindow: draft.rules.cancellationWindow,
                reschedulingAllowed: draft.rules.reschedulingAllowed
              }}
              defaultSlots={defaultSlots}
              isOpen
              launchMode
              onAddSlot={startAddingDefaultSlot}
              onApplyDefaults={() => {}}
              onChangeApplyScope={setApplyScope}
              onClose={() => setCurrentStep(steps.findIndex(step => step.id === 'services'))}
              onDeleteSlot={(slot) => updateDefaultSlots(defaultSlots.filter(time => time !== slot))}
              onDeleteScheduleTemplate={() => {}}
              onEditSlot={startEditingDefaultSlot}
              onApplyScheduleTemplate={applyScheduleTemplate}
              onFinishLater={finishLater}
              onSaveScheduleTemplate={() => {}}
              onSelectDate={() => {}}
              onUpdateAvailabilityRules={(patch) => updateRules(patch)}
              onSaveAvailabilitySettings={() => setCurrentStep(steps.findIndex(step => step.id === 'preview'))}
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
        </div>
      );
    }

    const serviceSummary = selectedServices.filter(service => service?.name?.trim()).slice(0, 3);
    const imageCount = selectedServices.reduce((total, service) => total + (Array.isArray(service.imageUrls) ? service.imageUrls.length : 0), 0);
    const publishCards = [
      {
        title: 'Personal details',
        done: hasPersonalDetails,
        detail: hasPersonalDetails ? 'Owner contact ready' : 'Add owner contact details',
        items: [
          ['Name', [draft.personalFirstName, draft.personalLastName].filter(Boolean).join(' ') || 'Not added'],
          ['Email', draft.personalEmail || 'Not added'],
          ['Phone', draft.personalPhoneNumber ? combinePhoneParts(draft.personalPhoneDialCode, draft.personalPhoneNumber) : 'Not added'],
          ['Country', draft.personalCountry || 'Not added']
        ]
      },
      {
        title: 'Business identity',
        done: Boolean(draft.brandName),
        detail: draft.brandName || 'Business name still needed',
        items: [
          ['Business type', preset.label],
          ['Business name', draft.brandName || 'Still needed'],
          ['Email', draft.businessEmail || 'Not added'],
          ['Slogan', draft.tagline || 'Not added']
        ]
      },
      {
        title: 'Services',
        done: hasVisibleService,
        detail: hasVisibleService ? `${serviceSummary.length} service${serviceSummary.length === 1 ? '' : 's'} ready` : 'Add one visible service with duration',
        items: serviceSummary.length
          ? [
              ...serviceSummary.map(service => [
                service.name,
                `${formatServiceDuration(service.duration) || 'Duration missing'}${formatServicePrice(service) ? ` | ${formatServicePrice(service)}` : ''}`
              ]),
              ['Service photos', imageCount ? `${imageCount} uploaded` : 'None yet']
            ]
          : [['Service', 'No service ready yet']]
      },
      {
        title: 'Hours',
        done: defaultSlots.length > 0,
        detail: `${defaultSlots.length} bookable time${defaultSlots.length === 1 ? '' : 's'} set`,
        items: [
          ['Bookable times', defaultSlots.slice(0, 6).join(', ') || 'No slots yet'],
          ['Schedule scope', applyScope === 'always' ? 'Reusable default schedule' : 'Temporary schedule scope']
        ]
      },
      {
        title: 'Booking behavior',
        done: true,
        detail: draft.rules.holdMode === 'confirmed' ? 'Bookings reserve time immediately' : 'Requests can be reviewed first',
        items: [
          ['Request mode', draft.rules.holdMode === 'confirmed' ? 'Confirm automatically' : 'Review requests first'],
          ['Minimum notice', draft.rules.bookingNotice || 'None'],
          ['Cancellation window', draft.rules.cancellationWindow || 'None'],
          ['Waitlist', draft.rules.waitlist === false ? 'Off' : 'On']
        ]
      },
      {
        title: 'Recommended after publish',
        done: false,
        detail: 'Not required for launch',
        items: [
          ['Next setup', 'Payments'],
          ['Next setup', 'Notifications'],
          ['Next setup', 'Google Calendar'],
          ['Next setup', 'Team setup']
        ]
      }
    ];
    publishCards.forEach(card => {
      card.meta = [];
    });

    return (
      <div className="onboarding-publish-summary">
        {publishCards.map(card => (
          <article key={card.title} className={`onboarding-summary-card onboarding-question ${card.done ? 'is-ready' : 'is-next'}`}>
            <span className={`onboarding-status-badge ${card.done ? 'is-done' : 'is-warning'}`}>
              {card.done ? <CheckCircle2 size={18} strokeWidth={2.2} /> : <CircleAlert size={18} strokeWidth={2.2} />}
            </span>
            <div>
              <p>{card.title}</p>
              <strong>{card.detail}</strong>
              <dl className="onboarding-review-list">
                {(card.items || []).map(([label, value], index) => (
                  <div key={`${card.title}-${label}-${index}`}>
                    <dt>{label}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              <small>
                {card.meta.filter(Boolean).slice(0, 3).join(' · ')}
                {card.meta.filter(Boolean).length > 3 ? ` · +${card.meta.filter(Boolean).length - 3} more` : ''}
              </small>
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
        <div className="onboarding-topbar-main">
          <BuildABookingBrand className="onboarding-brand-logo" />
          <div className="onboarding-topbar-actions">
            <span>Step {currentStep + 1} of {steps.length}</span>
            <b>Launch Score {launchScore}%</b>
            <button type="button" onClick={onFinishLater}>Save & exit</button>
          </div>
        </div>
        <OnboardingProgressPath
          currentStep={currentStep}
          onStepSelect={(stepIndex) => setCurrentStep(stepIndex)}
          steps={steps}
          launchScore={launchScore}
        />
      </header>
      <section className="onboarding-stage">
        <header className="onboarding-stage-header">
          <div>
            <p>Launch Path</p>
            <h1>{steps[currentStep].title}</h1>
            <span>{isGuestWorkspace ? 'Preview the setup flow in demo mode.' : 'Only the essentials required to publish. Styling, forms, payments, calendar, and team setup can come after.'}</span>
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
              <button type="button" className="is-later" onClick={finishLater} disabled={saving}>
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
