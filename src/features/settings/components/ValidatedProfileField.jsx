import { useEffect, useId, useState } from 'react';

/** Invalid drafts stay editable without being written to the public profile. */
export function ValidatedProfileField({ label, value = '', onChange, type = 'text', required = false, maxLength = 120, autoComplete }) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const [error, setError] = useState('');
  useEffect(() => { setDraft(value); setError(''); }, [value]);
  const edit = (event) => {
    const next = event.target.value;
    setDraft(next);
    const problem = required && !next.trim() ? `Enter your ${label.toLowerCase()}.`
      : type === 'email' && next && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next) ? 'Enter a valid email address.' : '';
    setError(problem);
    if (!problem) onChange(next);
  };
  return <label className="grid gap-1 text-sm">
    <span className="font-semibold">{label}</span>
    <input aria-label={label} className="native-control-input px-4" value={draft} type={type} required={required}
      autoComplete={autoComplete} maxLength={maxLength} onChange={edit}
      aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} />
    {error && <small id={`${id}-error`} className="bb-reschedule-error" role="status">{error} This draft has not been saved.</small>}
  </label>;
}
