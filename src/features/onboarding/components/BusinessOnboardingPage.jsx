import { useMemo, useState } from 'react';
import {
  ArrowLeft,
  ArrowRight,
  Baby,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  Camera,
  Car,
  Check,
  Clock,
  Dumbbell,
  GraduationCap,
  Home,
  Hotel,
  Megaphone,
  PawPrint,
  PlayCircle,
  Scissors,
  Sparkles,
  SprayCan,
  Store,
  Utensils,
  Wrench
} from 'lucide-react';
import { OnboardingChoiceCard } from './OnboardingChoiceCard';
import { OnboardingCompleteCard } from './OnboardingCompleteCard';
import { OnboardingPreviewPanel } from './OnboardingPreviewPanel';
import { OnboardingProgressPath } from './OnboardingProgressPath';
import {
  availabilityPresets,
  buildOnboardingDefaults,
  createIndustryPreset,
  getIndustryGroupForBusinessType,
  industryGroups,
  industryPresets
} from '../utils/onboardingModel';

const steps = [
  { id: 'welcome', number: '01', title: 'Start', short: 'Launch path' },
  { id: 'business', number: '02', title: 'Business', short: 'Identity' },
  { id: 'services', number: '03', title: 'Services', short: 'Visible service' },
  { id: 'availability', number: '04', title: 'Hours', short: 'Bookable times' },
  { id: 'rules', number: '05', title: 'Requests', short: 'Booking behavior' },
  { id: 'preview', number: '06', title: 'Publish', short: 'Readiness check' }
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

const requestChoices = [
  { id: 'request', label: 'Request first', description: 'You approve or decline each booking before it is confirmed.', notice: '24h', cancellation: '24h', holdMode: 'pending_confirmed' },
  { id: 'auto', label: 'Auto-confirm', description: 'Bookings confirm automatically when the time is open.', notice: '2h', cancellation: '12h', holdMode: 'confirmed' },
  { id: 'strict', label: 'Protect my calendar', description: 'More notice and cancellation guardrails for busy teams.', notice: '24h', cancellation: '48h', holdMode: 'pending_confirmed' }
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
  const [draft, setDraft] = useState(() => ({
    industry: settings.serviceIndustry || 'salon',
    brandName: settings.brandName && settings.brandName !== 'Your Business' ? settings.brandName : '',
    tagline: settings.tagline || '',
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
  const [selectedIndustryGroupId, setSelectedIndustryGroupId] = useState(() => (
    getIndustryGroupForBusinessType(settings.serviceIndustry || 'salon').id
  ));

  const preset = createIndustryPreset(draft.industry);
  const selectedServices = draft.services.length ? draft.services : preset.services;
  const selectedIndustryGroup = industryGroups.find(group => group.id === selectedIndustryGroupId) || industryGroups[0];
  const visibleBusinessTypes = selectedIndustryGroup.businessTypes
    .map(id => [id, industryPresets[id]])
    .filter(([, option]) => Boolean(option));
  const stepId = steps[currentStep].id;
  const launchScore = Math.round(((currentStep + (complete ? 1 : 0)) / steps.length) * 100);
  const hasVisibleService = selectedServices.some(service => service?.name?.trim() && String(service.duration || '').trim());
  const canContinue = useMemo(() => {
    if (stepId === 'business') return Boolean((draft.brandName || '').trim());
    if (stepId === 'services') return hasVisibleService;
    return true;
  }, [draft.brandName, hasVisibleService, stepId]);

  const updateDraft = (patch) => setDraft(prev => ({ ...prev, ...patch }));
  const updateRules = (patch) => setDraft(prev => ({ ...prev, rules: { ...prev.rules, ...patch } }));

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

  const chooseBusinessType = (id, option) => updateDraft({
    industry: id,
    accent: option.accent,
    tagline: option.tagline,
    services: option.services
  });

  const renderStep = () => {
    if (stepId === 'welcome') {
      return (
        <div className="onboarding-welcome-card">
          <div className="onboarding-welcome-orbit" aria-hidden="true">
            <span>Business</span>
            <span>Services</span>
            <span>Hours</span>
          </div>
          <p>Welcome to Build A Booking</p>
          <h2>Publish a usable booking page without the settings maze.</h2>
          <span>We will only collect the essentials: business identity, one visible service, default hours, request behavior, and a final readiness check.</span>
        </div>
      );
    }

    if (stepId === 'business') {
      return (
        <div className="onboarding-business-step">
          <section className="onboarding-type-panel" aria-label="Business type">
            <div className="onboarding-type-panel-head">
              <div>
                <p className="onboarding-specific-label">Business type</p>
                <h2>Choose the closest match.</h2>
              </div>
              <span>{preset.label}</span>
            </div>
            <div className="onboarding-type-layout">
              <nav className="onboarding-type-rail" aria-label="Industry groups">
                {industryGroups.map(group => (
                  <button
                    key={group.id}
                    type="button"
                    aria-current={selectedIndustryGroupId === group.id ? 'true' : undefined}
                    className={selectedIndustryGroupId === group.id ? 'is-active' : ''}
                    onClick={() => {
                      setSelectedIndustryGroupId(group.id);
                      const firstBusinessType = group.businessTypes[0];
                      chooseBusinessType(firstBusinessType, createIndustryPreset(firstBusinessType));
                    }}
                  >
                    <strong>{group.label}</strong>
                    <small>{group.businessTypes.length} types</small>
                  </button>
                ))}
              </nav>
              <div className="onboarding-type-list" role="radiogroup" aria-label={`${selectedIndustryGroup.label} business types`}>
                <p>{selectedIndustryGroup.description}</p>
                {visibleBusinessTypes.map(([id, option]) => (
                  <button
                    key={id}
                    type="button"
                    className={draft.industry === id ? 'is-active' : ''}
                    aria-pressed={draft.industry === id}
                    onClick={() => chooseBusinessType(id, option)}
                  >
                    <span className="onboarding-choice-icon" aria-hidden="true">{industryIcons[id] || <Store size={22} />}</span>
                    <strong>{option.label}</strong>
                    <small>{option.goal}</small>
                    <em>{draft.industry === id ? 'Selected' : 'Choose'}</em>
                  </button>
                ))}
              </div>
            </div>
          </section>
          <div className="onboarding-form-card">
            <div className="onboarding-selected-type">
              <span className="onboarding-choice-icon" aria-hidden="true">{industryIcons[draft.industry] || <Store size={22} />}</span>
              <div>
                <p>Selected type</p>
                <strong>{preset.label}</strong>
                <small>{selectedServices.length} starter services will be suggested next.</small>
              </div>
            </div>
            <label>
              <span>Business name</span>
              <input
                autoFocus
                value={draft.brandName}
                onChange={(event) => updateDraft({ brandName: event.target.value })}
                placeholder={user?.displayName ? `${user.displayName}'s Studio` : 'Your Business'}
              />
            </label>
            <label>
              <span>Tagline optional</span>
              <input
                value={draft.tagline}
                onChange={(event) => updateDraft({ tagline: event.target.value })}
                placeholder={preset.tagline}
              />
            </label>
            <label>
              <span>Business email</span>
              <input
                value={draft.businessEmail || user?.email || ''}
                onChange={(event) => updateDraft({ businessEmail: event.target.value })}
                placeholder="hello@yourbusiness.com"
              />
            </label>
            <div className="onboarding-toggle-strip">
              {[
                ['online', 'Online'],
                ['my_location', 'At my location'],
                ['mobile', 'I travel to clients']
              ].map(([id, label]) => (
                <button key={id} type="button" className={draft.locationMode === id ? 'is-on' : ''} onClick={() => updateDraft({ locationMode: id })}>
                  <Check size={16} /> {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      );
    }

    if (stepId === 'services') {
      return (
        <div className="onboarding-service-stack">
          {selectedServices.map((service, index) => (
            <div key={`${service.name}-${index}`} className="onboarding-service-edit-card">
              <span>{String(index + 1).padStart(2, '0')}</span>
              <label>
                <small>Service name</small>
                <input
                  value={service.name}
                  onChange={(event) => {
                    const next = selectedServices.map((item, itemIndex) => itemIndex === index ? { ...item, name: event.target.value } : item);
                    updateDraft({ services: next });
                  }}
                />
              </label>
              <label>
                <small>Duration minutes</small>
                <input
                  value={service.duration}
                  onChange={(event) => {
                    const next = selectedServices.map((item, itemIndex) => itemIndex === index ? { ...item, duration: event.target.value } : item);
                    updateDraft({ services: next });
                  }}
                />
              </label>
              <label>
                <small>Price optional</small>
                <input
                  value={service.price}
                  onChange={(event) => {
                    const next = selectedServices.map((item, itemIndex) => itemIndex === index ? { ...item, price: event.target.value } : item);
                    updateDraft({ services: next });
                  }}
                />
              </label>
            </div>
          ))}
        </div>
      );
    }

    if (stepId === 'availability') {
      return (
        <div className="onboarding-step-grid">
          {Object.entries(availabilityPresets).map(([id, option]) => (
            <OnboardingChoiceCard
              key={id}
              active={draft.availability === id}
              description={`${option.availableTimes.length} bookable times per active day`}
              eyebrow="Default hours"
              icon={<CalendarDays size={22} />}
              label={option.label}
              meta={Object.keys(option.schedule).join(', ')}
              onClick={() => updateDraft({ availability: id })}
            />
          ))}
        </div>
      );
    }

    if (stepId === 'rules') {
      return (
        <div className="onboarding-rules-layout">
          <div className="onboarding-step-grid">
            {requestChoices.map(option => (
              <OnboardingChoiceCard
                key={option.id}
                active={draft.rules.holdMode === option.holdMode && draft.rules.bookingNotice === option.notice}
                description={option.description}
                eyebrow="Request behavior"
                icon={<Clock size={22} />}
                label={option.label}
                meta={option.id === 'request' ? 'Recommended' : `${option.notice || '0h'} notice`}
                onClick={() => updateRules({ bookingNotice: option.notice, cancellationWindow: option.cancellation, holdMode: option.holdMode })}
              />
            ))}
          </div>
          <div className="onboarding-toggle-strip">
            <button type="button" className={draft.rules.waitlist ? 'is-on' : ''} onClick={() => updateRules({ waitlist: !draft.rules.waitlist })}>
              <Check size={16} /> Waitlist when full
            </button>
            <button type="button" className={draft.rules.reschedulingAllowed ? 'is-on' : ''} onClick={() => updateRules({ reschedulingAllowed: !draft.rules.reschedulingAllowed })}>
              <Check size={16} /> Clients can reschedule
            </button>
          </div>
        </div>
      );
    }

    return (
      <div className="onboarding-launch-list">
        {[
          ['Business identity', draft.brandName || 'Name your business', Boolean(draft.brandName)],
          ['Visible service', hasVisibleService ? `${selectedServices.length} suggested services` : 'Add one service with duration', hasVisibleService],
          ['Default hours', availabilityPresets[draft.availability]?.label || 'Weekdays', true],
          ['Request behavior', draft.rules.holdMode === 'confirmed' ? 'Auto-confirm bookings' : 'Request first approval', true],
          ['Default client form', 'Name and email required. Phone and notes optional.', true],
          ['Recommended after publish', 'Payments, notifications, Google Calendar, team, and migration.', false]
        ].map(([title, detail, done]) => (
          <div key={title}>
            <span className={done ? 'is-done' : ''}>{done ? <Check size={15} /> : '!'}</span>
            <strong>{title}</strong>
            <small>{detail}</small>
          </div>
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
      <OnboardingProgressPath currentStep={currentStep} steps={steps} launchScore={launchScore} />
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
        <footer className="onboarding-stage-footer">
          <button type="button" onClick={goBack} disabled={currentStep === 0 || saving}>
            <ArrowLeft size={16} /> Back
          </button>
          <button type="button" className="is-primary" onClick={goNext} disabled={!canContinue || saving}>
            {saving ? 'Publishing...' : currentStep === steps.length - 1 ? 'Publish booking page' : 'Continue'}
            {!saving && <ArrowRight size={16} />}
          </button>
        </footer>
      </section>
      <OnboardingPreviewPanel draft={draft} stepId={stepId} />
    </main>
  );
}
