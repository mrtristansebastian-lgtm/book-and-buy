import { DURATION_PRESETS, parseDurationMinutes } from '../../../utils/services';
import { useState } from 'react';
import { FilterChip } from '../../../shared/ui/FilterChip';

export function DurationPicker({ label, value, onChange, hint = '' }) {
  const minutes = parseDurationMinutes(value);
  const isCustom = minutes > 0 && !DURATION_PRESETS.includes(minutes);
  const [custom, setCustom] = useState(() => isCustom || !minutes);

  return (
    <div className="bb-services-duration">
      <div className="bb-services-field-label-row">
        <span className="bb-services-field-label">{label}</span>
        {hint ? <span className="bb-services-field-hint">{hint}</span> : null}
      </div>
      <div className="bb-services-duration-presets" role="group" aria-label={label}>
        {DURATION_PRESETS.map((preset) => {
          const active = !custom && minutes === preset;
          return (
            <FilterChip
              key={preset}
              type="button"
              selected={active}
              className={`bb-services-duration-chip${active ? ' is-active' : ''}`}
              onClick={() => { setCustom(false); onChange(String(preset)); }}
            >
              {preset} min
            </FilterChip>
          );
        })}
        <FilterChip
          type="button"
          selected={custom || isCustom}
          className={`bb-services-duration-chip${custom || isCustom ? ' is-active' : ''}`}
          onClick={() => {
            setCustom(true);
            if (!minutes) onChange('75');
          }}
        >
          Custom
        </FilterChip>
      </div>
      {custom || isCustom || !minutes ? (
        <label className="bb-services-field">
          <span>Minutes</span>
          <input
            className="native-control-input bb-services-control"
            inputMode="numeric"
            value={value}
            placeholder="e.g. 75"
            onChange={(event) => onChange(event.target.value.replace(/[^\d]/g, ''))}
          />
        </label>
      ) : null}
    </div>
  );
}
