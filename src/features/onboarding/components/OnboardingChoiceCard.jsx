export function OnboardingChoiceCard({
  active = false,
  description,
  eyebrow,
  icon,
  label,
  meta,
  onClick
}) {
  return (
    <button
      type="button"
      className={`onboarding-choice-card ${active ? 'is-active' : ''}`}
      onClick={onClick}
      aria-pressed={active}
    >
      <span className="onboarding-choice-icon" aria-hidden="true">{icon}</span>
      <span className="onboarding-choice-copy">
        {eyebrow && <span>{eyebrow}</span>}
        <strong>{label}</strong>
        <small>{description}</small>
      </span>
      {meta && <em>{meta}</em>}
    </button>
  );
}
