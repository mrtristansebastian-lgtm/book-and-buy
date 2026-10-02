import { useState } from 'react';
import { parseCancellationNotice } from '../../../utils/bookingPreferences';

export function CancellationNoticeField({ value = '', onChange }) {
  const parsed = parseCancellationNotice(value);
  const [emptyUnit, setEmptyUnit] = useState('hours');
  const unit = parsed?.unit || emptyUnit;
  return <div className="bb-cancellation-notice"><strong>Cancellation notice guidance</strong>
    {value && !parsed ? <><label className="bb-market-field">Existing custom guidance<input className="native-control-input" value={value} onChange={(event) => onChange(event.target.value)} /></label><button type="button" className="bb-ghost-btn" onClick={() => onChange('')}>Use a duration instead</button></> : <div className="bb-commerce-field-grid"><label className="bb-market-field">Notice period<input className="native-control-input" type="number" min="1" max="9999" step="1" placeholder="Not specified" value={parsed?.amount ?? ''} onChange={(event) => { const amount = Number(event.target.value); if (!event.target.value) onChange(''); else if (Number.isInteger(amount) && amount >= 1 && amount <= 9999) onChange(`${amount} ${unit}`); }} /></label><label className="bb-market-field">Unit<select value={unit} onChange={(event) => { setEmptyUnit(event.target.value); if (parsed) onChange(`${parsed.amount} ${event.target.value}`); }}><option value="hours">Hours</option><option value="days">Days</option><option value="weeks">Weeks</option></select></label></div>}
    <small className="bb-muted">A saved preference, not an automatically enforced cutoff. Explain your cancellation terms in Policies.</small>
  </div>;
}
