import { Check } from 'lucide-react';

export function StepRail({ steps, index }) {
  return (
    <ol className="bb-composer-steps" aria-label="Composer steps">
      {steps.map((step, i) => (
        <li
          key={step.id}
          className={`bb-composer-step${i === index ? ' is-active' : ''}${
            i < index ? ' is-done' : ''
          }`}
          aria-current={i === index ? 'step' : undefined}
        >
          <span className="bb-composer-step-index">
            {i < index ? <Check size={12} strokeWidth={3} /> : i + 1}
          </span>
          <span className="bb-composer-step-label">{step.label}</span>
        </li>
      ))}
    </ol>
  );
}
