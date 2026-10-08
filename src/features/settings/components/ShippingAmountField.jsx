import { useEffect, useId, useState } from 'react';
import { shippingAmount } from '../settingsValidation';

export function ShippingAmountField({ label, cents, optional = false, hint, onChange, onValidityChange }) {
  const id = useId();
  const saved = cents == null ? '' : String(cents / 100);
  const [draft, setDraft] = useState(saved);
  const [error, setError] = useState('');
  useEffect(() => { setDraft(saved); setError(''); }, [saved]);
  const commit = () => {
    const value = shippingAmount(draft, optional);
    if (value === undefined) { setError('Enter a valid, non-negative amount. This draft has not been saved.'); onValidityChange?.(false); return; }
    setError(''); onValidityChange?.(true); onChange(value);
  };
  return <label className="bb-market-field">{label}
    <input aria-label={label} aria-invalid={Boolean(error)} aria-describedby={`${id}-hint`}
      className="native-control-input" type="number" inputMode="decimal" min="0" step="0.01"
      placeholder={optional ? 'No threshold' : '0.00'} value={draft}
      onChange={(event) => { setDraft(event.target.value); setError(''); onValidityChange?.(shippingAmount(event.target.value, optional) !== undefined); }} onBlur={commit}
      onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); event.currentTarget.blur(); } }} />
    <small id={`${id}-hint`} role={error ? 'status' : undefined} className={error ? 'bb-reschedule-error' : ''}>{error || hint}</small>
  </label>;
}
