import { useEffect, useId, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  formatTimeValue,
  parseTimeValue,
  snapMinute
} from '../../utils/time';

function clampHour(value) {
  const n = Number.parseInt(String(value).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n)) return 0;
  return Math.min(23, Math.max(0, n));
}

function clampMinute(value, step = 5) {
  const n = Number.parseInt(String(value).replace(/\D/g, ''), 10);
  if (!Number.isFinite(n)) return 0;
  return snapMinute(Math.min(59, Math.max(0, n)), step);
}

function stepHour(hour, delta) {
  return (hour + delta + 24) % 24;
}

function stepMinute(minute, delta, step = 5) {
  const safeStep = Math.max(1, Number(step) || 5);
  let next = minute + delta * safeStep;
  if (next >= 60) next = 0;
  if (next < 0) next = 60 - safeStep;
  return snapMinute(next, safeStep);
}

export function TimeField({
  value = '',
  onChange,
  label = '',
  id,
  disabled = false,
  minuteStep = 5,
  placeholder = 'HH:MM',
  className = ''
}) {
  const autoId = useId();
  const fieldId = id || autoId;
  const [open, setOpen] = useState(false);
  const parsed = useMemo(() => parseTimeValue(value, '09:00'), [value]);
  const [draftHour, setDraftHour] = useState(parsed.hour);
  const [draftMinute, setDraftMinute] = useState(snapMinute(parsed.minute, minuteStep));
  const [hourText, setHourText] = useState(String(parsed.hour).padStart(2, '0'));
  const [minuteText, setMinuteText] = useState(
    String(snapMinute(parsed.minute, minuteStep)).padStart(2, '0')
  );

  const display = value ? formatTimeValue(parsed.hour, parsed.minute) : '';

  useEffect(() => {
    if (!open) return;
    const next = parseTimeValue(value, '09:00');
    const hour = next.hour;
    const minute = snapMinute(next.minute, minuteStep);
    setDraftHour(hour);
    setDraftMinute(minute);
    setHourText(String(hour).padStart(2, '0'));
    setMinuteText(String(minute).padStart(2, '0'));
  }, [open, value, minuteStep]);

  const commitHourText = () => {
    const hour = clampHour(hourText);
    setDraftHour(hour);
    setHourText(String(hour).padStart(2, '0'));
  };

  const commitMinuteText = () => {
    const minute = clampMinute(minuteText, minuteStep);
    setDraftMinute(minute);
    setMinuteText(String(minute).padStart(2, '0'));
  };

  const confirm = () => {
    const hour = clampHour(hourText);
    const minute = clampMinute(minuteText, minuteStep);
    onChange?.(formatTimeValue(hour, minute));
    setOpen(false);
  };

  return (
    <div className={`bb-time-field${className ? ` ${className}` : ''}${disabled ? ' is-disabled' : ''}`}>
      {label ? (
        <label className="bb-time-field-label" htmlFor={fieldId}>
          {label}
        </label>
      ) : null}
      <div className="bb-time-field-control">
        <button
          id={fieldId}
          type="button"
          className="bb-time-field-value"
          disabled={disabled}
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
        >
          <span className={display ? '' : 'is-placeholder'}>{display || placeholder}</span>
        </button>
        <button
          type="button"
          className="bb-time-field-pick"
          disabled={disabled}
          onClick={() => {
            if (!disabled) setOpen(true);
          }}
        >
          Pick
        </button>
      </div>

      {open ? (
        <div
          className="bb-time-picker-backdrop"
          role="presentation"
          onClick={() => setOpen(false)}
        >
          <div
            className="bb-panel bb-time-picker-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${fieldId}-title`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="bb-time-picker-head">
              <h2 id={`${fieldId}-title`} className="bb-time-picker-title">
                {label ? `Set ${label.toLowerCase()}` : 'Set time'}
              </h2>
              <p className="bb-time-picker-hint">Tap digits to type, or use the arrows.</p>
            </header>

            <div className="bb-time-clock" aria-label="Digital time">
              <div className="bb-time-clock-segment">
                <button
                  type="button"
                  className="bb-time-clock-step"
                  aria-label="Increase hour"
                  onClick={() => {
                    const hour = stepHour(draftHour, 1);
                    setDraftHour(hour);
                    setHourText(String(hour).padStart(2, '0'));
                  }}
                >
                  <ChevronUp size={18} strokeWidth={2.4} />
                </button>
                <input
                  className="bb-time-clock-digit"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  aria-label="Hour"
                  value={hourText}
                  onChange={(event) => setHourText(event.target.value.replace(/\D/g, '').slice(0, 2))}
                  onBlur={commitHourText}
                  onFocus={(event) => event.target.select()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitHourText();
                      confirm();
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      const hour = stepHour(draftHour, 1);
                      setDraftHour(hour);
                      setHourText(String(hour).padStart(2, '0'));
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      const hour = stepHour(draftHour, -1);
                      setDraftHour(hour);
                      setHourText(String(hour).padStart(2, '0'));
                    }
                  }}
                />
                <button
                  type="button"
                  className="bb-time-clock-step"
                  aria-label="Decrease hour"
                  onClick={() => {
                    const hour = stepHour(draftHour, -1);
                    setDraftHour(hour);
                    setHourText(String(hour).padStart(2, '0'));
                  }}
                >
                  <ChevronDown size={18} strokeWidth={2.4} />
                </button>
                <span className="bb-time-clock-caption">Hour</span>
              </div>

              <span className="bb-time-clock-colon" aria-hidden="true">
                :
              </span>

              <div className="bb-time-clock-segment">
                <button
                  type="button"
                  className="bb-time-clock-step"
                  aria-label="Increase minutes"
                  onClick={() => {
                    const minute = stepMinute(draftMinute, 1, minuteStep);
                    setDraftMinute(minute);
                    setMinuteText(String(minute).padStart(2, '0'));
                  }}
                >
                  <ChevronUp size={18} strokeWidth={2.4} />
                </button>
                <input
                  className="bb-time-clock-digit"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength={2}
                  aria-label="Minute"
                  value={minuteText}
                  onChange={(event) => setMinuteText(event.target.value.replace(/\D/g, '').slice(0, 2))}
                  onBlur={commitMinuteText}
                  onFocus={(event) => event.target.select()}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      commitMinuteText();
                      confirm();
                    }
                    if (event.key === 'ArrowUp') {
                      event.preventDefault();
                      const minute = stepMinute(draftMinute, 1, minuteStep);
                      setDraftMinute(minute);
                      setMinuteText(String(minute).padStart(2, '0'));
                    }
                    if (event.key === 'ArrowDown') {
                      event.preventDefault();
                      const minute = stepMinute(draftMinute, -1, minuteStep);
                      setDraftMinute(minute);
                      setMinuteText(String(minute).padStart(2, '0'));
                    }
                  }}
                />
                <button
                  type="button"
                  className="bb-time-clock-step"
                  aria-label="Decrease minutes"
                  onClick={() => {
                    const minute = stepMinute(draftMinute, -1, minuteStep);
                    setDraftMinute(minute);
                    setMinuteText(String(minute).padStart(2, '0'));
                  }}
                >
                  <ChevronDown size={18} strokeWidth={2.4} />
                </button>
                <span className="bb-time-clock-caption">Min</span>
              </div>
            </div>

            <footer className="bb-time-picker-actions">
              <button type="button" className="bb-ghost-btn" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button type="button" className="bb-primary-btn" onClick={confirm}>
                Confirm
              </button>
            </footer>
          </div>
        </div>
      ) : null}
    </div>
  );
}
