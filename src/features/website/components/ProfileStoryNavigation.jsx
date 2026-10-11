import { ArrowRight } from 'lucide-react';
import { profileJourney } from '../profileModel';

/** Quiet continuation within business information; catalogs keep their corner controls. */
export function ProfileStoryNavigation({ workspace, page = 'home', onOpenPage }) {
  const nextStory = profileJourney(workspace, page).nextStory ||
    (['terms', 'privacy', 'cancellation'].includes(page) ? { id: 'home', label: 'Business card' } : null);
  if (page === 'home' || !nextStory) return null;
  const label = `Next page · ${nextStory.label}`;
  return <nav className="bb-profile-section-progress" aria-label="Continue exploring this business">
    <button type="button" onClick={() => onOpenPage(nextStory.id)}>
      <span>{label}</span><ArrowRight size={14} strokeWidth={1.5} aria-hidden="true" />
    </button>
  </nav>;
}
