import { ProgressRing } from './ProgressRing';

export function CharacterCount({ value, limit }) {
  const ratio = limit > 0 ? value / limit : 0;
  const tone = ratio > 1 ? 'over' : ratio > 0.9 ? 'warn' : 'calm';
  const remaining = limit - value;
  return (
    <span className={`bb-composer-count bb-composer-count--${tone}`}>
      <ProgressRing value={Math.min(1, ratio)} size={22} tone={tone} />
      <span>{ratio > 0.8 ? remaining : value}</span>
    </span>
  );
}
