import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, X } from 'lucide-react';
import { DateField } from '../../../shared/ui/DateField';
import { addDays, parseDateKey, toDateKey } from '../../../utils/dates';

const PRESET_OPTIONS = [
  { id: '7', days: 7, label: '1 week' },
  { id: '14', days: 14, label: '2 weeks' },
  { id: '30', days: 30, label: '1 month' },
  { id: '60', days: 60, label: '2 months' },
  { id: '90', days: 90, label: '3 months' },
  { id: '180', days: 180, label: '6 months' },
  { id: '365', days: 365, label: '1 year' },
  { id: '0', days: 0, label: 'No limit' }
];

function formatUntilLabel(dateKey = '') {
  const date = parseDateKey(dateKey);
  if (!date) return dateKey;
  return date.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric'
  });
}

function daysBetween(startKey, endKey) {
  const start = parseDateKey(startKey);
  const end = parseDateKey(endKey);
  if (!start || !end) return null;
  return Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

function resolveMode(days, untilKey, todayKey) {
  const until = String(untilKey || '').trim();
  if (until && /^\d{4}-\d{2}-\d{2}$/.test(until)) {
    return { mode: 'custom', until };
  }
  const matched = PRESET_OPTIONS.find((option) => option.days === Number(days));
  if (matched) return { mode: matched.id, until: '' };
  const derivedDays = Math.max(0, Number(days) || 0);
  if (!derivedDays) return { mode: '0', until: '' };
  return {
    mode: 'custom',
    until: toDateKey(addDays(parseDateKey(todayKey) || new Date(), derivedDays))
  };
}

export function AdvanceBookingField({
  days = 90,
  until = '',
  onChange,
  disabled = false
}) {
  const todayKey = toDateKey(new Date());
  const resolved = useMemo(
    () => resolveMode(days, until, todayKey),
    [days, until, todayKey]
  );
  const [open, setOpen] = useState(false);
  const [draftMode, setDraftMode] = useState(resolved.mode);
  const [draftUntil, setDraftUntil] = useState(
    resolved.until || toDateKey(addDays(new Date(), Math.max(1, Number(days) || 90)))
  );

  useEffect(() => {
    if (!open) return;
    setDraftMode(resolved.mode);
    setDraftUntil(
      resolved.until || toDateKey(addDays(new Date(), Math.max(1, Number(days) || 90)))
    );
  }, [open, resolved.mode, resolved.until, days]);

  const triggerLabel = useMemo(() => {
    if (resolved.mode === 'custom' && resolved.until) {
      return `Until ${formatUntilLabel(resolved.until)}`;
    }
    return PRESET_OPTIONS.find((option) => option.id === resolved.mode)?.label || 'Choose';
  }, [resolved]);

  const customValid =
    Boolean(draftUntil) && draftUntil >= todayKey && Boolean(parseDateKey(draftUntil));
  const canApply = draftMode !== 'custom' || customValid;

  const apply = () => {
    if (!canApply) return;
    if (draftMode === 'custom') {
      const span = daysBetween(todayKey, draftUntil);
      onChange?.({
        maxAdvanceBookingDays: Math.max(0, span ?? 0),
        maxAdvanceBookingUntil: draftUntil
      });
    } else {
      const preset = PRESET_OPTIONS.find((option) => option.id === draftMode);
      onChange?.({
        maxAdvanceBookingDays: preset?.days ?? 90,
        maxAdvanceBookingUntil: ''
      });
    }
    setOpen(false);
  };

  return (
    <>
      <div className={`bb-advance-field${disabled ? ' is-disabled' : ''}`}>
        <span className="bb-advance-field-label">Book ahead</span>
        <button
          type="button"
          className="bb-advance-field-value"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
        >
          <span>{triggerLabel}</span>
          <ChevronDown size={15} strokeWidth={2.4} />
        </button>
      </div>

      {open ? (
        <div
          className="bb-advance-picker-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="bb-advance-picker-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="advance-booking-title"
            onClick={(event) => event.stopPropagation()}
          >
            <header className="bb-advance-picker-head">
              <h2 id="advance-booking-title" className="bb-advance-picker-title">
                Book ahead
              </h2>
              <p className="bb-advance-picker-hint">
                How far into the future clients can schedule on your public Book page.
              </p>
            </header>

            <div className="bb-advance-picker-presets" role="listbox" aria-label="Duration">
              {PRESET_OPTIONS.map((option) => {
                const active = draftMode === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    role="option"
                    aria-selected={active}
                    className={`bb-advance-picker-preset${active ? ' is-active' : ''}`}
                    onClick={() => setDraftMode(option.id)}
                  >
                    <span>{option.label}</span>
                    {active ? <Check size={15} strokeWidth={2.5} /> : null}
                  </button>
                );
              })}
            </div>

            <div className={`bb-advance-picker-custom${draftMode === 'custom' ? ' is-open' : ''}`}>
              <button
                type="button"
                className={`bb-advance-picker-custom-toggle${
                  draftMode === 'custom' ? ' is-active' : ''
                }`}
                aria-pressed={draftMode === 'custom'}
                onClick={() => setDraftMode('custom')}
              >
                <span>Custom end date</span>
                {draftMode === 'custom' ? <Check size={15} strokeWidth={2.5} /> : null}
              </button>

              {draftMode === 'custom' ? (
                <DateField
                  label="Book until"
                  value={draftUntil}
                  min={todayKey}
                  onChange={setDraftUntil}
                />
              ) : null}
            </div>

            <footer className="bb-advance-picker-actions">
              <button type="button" className="bb-ghost-btn" onClick={() => setOpen(false)}>
                <X size={15} /> Cancel
              </button>
              <button
                type="button"
                className="bb-primary-btn"
                disabled={!canApply}
                onClick={apply}
              >
                Apply
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </>
  );
}
