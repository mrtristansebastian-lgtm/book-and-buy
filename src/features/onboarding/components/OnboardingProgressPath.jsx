import { Check } from 'lucide-react';

export function OnboardingProgressPath({ currentStep, onStepSelect, steps, launchScore }) {
  return (
    <aside className="onboarding-progress-path" aria-label="Setup progress">
      <div className="onboarding-mascot-card">
        <div className="onboarding-mascot" aria-hidden="true">↗</div>
        <p>Launch Score</p>
        <strong>{launchScore}%</strong>
        <span>In a few focused steps, your booking page will be ready to share.</span>
      </div>
      <ol>
        {steps.map((step, index) => {
          const complete = index < currentStep;
          const active = index === currentStep;
          return (
            <li key={step.id} className={`${active ? 'is-active' : ''} ${complete ? 'is-complete' : ''}`}>
              <button
                type="button"
                onClick={() => onStepSelect?.(index)}
                aria-current={active ? 'step' : undefined}
              >
                <span aria-hidden="true">
                  {complete ? <Check size={15} /> : step.number}
                </span>
                <div>
                  <strong>{step.title}</strong>
                  <small>{step.short}</small>
                </div>
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
