import { CalendarDays, FileText, Sparkles } from 'lucide-react';
import { availabilityPresets, createIndustryPreset } from '../utils/onboardingModel';

export function OnboardingPreviewPanel({ draft, stepId }) {
  const preset = createIndustryPreset(draft.industry);
  const availability = availabilityPresets[draft.availability] || availabilityPresets.weekdays;
  const brandName = draft.brandName || 'Your Business';
  const services = draft.services?.length ? draft.services : preset.services;

  return (
    <aside className="onboarding-preview-panel" aria-label="Booking page preview">
      <div className="onboarding-phone-frame">
        <div className="onboarding-phone-hero" style={{ '--onboarding-accent': draft.accent || preset.accent }}>
          <span>Live preview</span>
          <h3>{brandName}</h3>
          <p>{draft.tagline || preset.tagline}</p>
          <button type="button">Book now</button>
        </div>
        {stepId === 'availability' ? (
          <div className="onboarding-preview-times">
            {availability.availableTimes.slice(0, 6).map(time => <span key={time}>{time}</span>)}
          </div>
        ) : stepId === 'rules' || stepId === 'preview' ? (
          <div className="onboarding-preview-form">
            {['Name required', 'Email required', 'Phone optional', 'Notes optional'].map(field => (
              <span key={field}><FileText size={13} /> {field}</span>
            ))}
          </div>
        ) : (
          <div className="onboarding-preview-list">
            {services.slice(0, 3).map(service => (
              <div key={service.name} className="onboarding-preview-service">
                <strong>{service.name}</strong>
                <span>{service.duration || 60} min / R{service.price || 350}</span>
              </div>
            ))}
          </div>
        )}
        <div className="onboarding-preview-meta">
          <span><CalendarDays size={14} /> {availability.label}</span>
          <span><FileText size={14} /> Request first defaults</span>
          <span><Sparkles size={14} /> Waitlist + reminders on</span>
        </div>
      </div>
    </aside>
  );
}
