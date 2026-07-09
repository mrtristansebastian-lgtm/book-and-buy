import { Check, Lock } from 'lucide-react';

export function OnboardingProgressPath({ currentStep, steps, launchScore }) {
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
              <span aria-hidden="true">
                {complete ? <Check size={15} /> : active ? step.number : <Lock size={14} />}
              </span>
              <div>
                <strong aria-current={active ? 'step' : undefined}>{step.title}</strong>
                <small>{step.short}</small>
              </div>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
