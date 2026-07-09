import { ArrowRight, Copy, Palette, PartyPopper } from 'lucide-react';

export function OnboardingCompleteCard({
  bookingPageUrl,
  onCopyLink,
  onEditPage,
  onOpenDashboard
}) {
  return (
    <section className="onboarding-complete-card" aria-live="polite">
      <div className="onboarding-complete-burst" aria-hidden="true">
        <PartyPopper size={42} />
      </div>
      <p>Setup quest complete</p>
      <h2>Your booking workspace has a real starting point now.</h2>
      <span>
        Services, availability, rules, reminders, and booking-page copy are ready. You can polish the details later instead of starting from a blank app.
      </span>
      <div className="onboarding-complete-actions">
        <button type="button" className="is-primary" onClick={onOpenDashboard}>
          Open dashboard <ArrowRight size={16} />
        </button>
        <button type="button" onClick={onEditPage}>
          <Palette size={16} /> Edit booking page
        </button>
        <button type="button" onClick={onCopyLink} disabled={!bookingPageUrl}>
          <Copy size={16} /> Copy booking link
        </button>
      </div>
    </section>
  );
}
