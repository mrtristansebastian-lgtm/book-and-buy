import { DURATION_PRESETS, parseDurationMinutes } from '../../../utils/services';

export function DurationPicker({ label, value, onChange, hint = '' }) {
  const minutes = parseDurationMinutes(value);
  const isCustom = minutes > 0 && !DURATION_PRESETS.includes(minutes);

  return (
    <div className="bb-services-duration">
      <div className="bb-services-field-label-row">
        <span className="bb-services-field-label">{label}</span>
        {hint ? <span className="bb-services-field-hint">{hint}</span> : null}
      </div>
      <div className="bb-services-duration-presets" role="group" aria-label={label}>
        {DURATION_PRESETS.map((preset) => {
          const active = minutes === preset;
          return (
            <button
              key={preset}
              type="button"
              className={`bb-services-duration-chip${active ? ' is-active' : ''}`}
              onClick={() => onChange(String(preset))}
            >
              {preset} min
            </button>
          );
        })}
        <button
          type="button"
          className={`bb-services-duration-chip${isCustom ? ' is-active' : ''}`}
          onClick={() => {
            if (!isCustom) onChange(minutes ? String(minutes) : '75');
          }}
        >
          Custom
        </button>
      </div>
      {isCustom || !minutes ? (
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
