import { DISTANCE_MAX_KM, DISTANCE_MIN_KM } from '../../config/businessCategories';

function clampKm(value) {
  const n = Math.round(Number(value));
  if (!Number.isFinite(n)) return 30;
  return Math.min(DISTANCE_MAX_KM, Math.max(DISTANCE_MIN_KM, n));
}

export function DistanceRingControl({ value = 30, onChange, disabled = false }) {
  const km = clampKm(value);
  const span = DISTANCE_MAX_KM - DISTANCE_MIN_KM;
  const fillPct = span > 0 ? ((km - DISTANCE_MIN_KM) / span) * 100 : 0;

  return (
    <div
      className={`bb-distance-slider-row${disabled ? ' is-disabled' : ''}`}
      role="group"
      aria-label="Distance from me"
    >
      <span className="bb-distance-slider-label">Within</span>
      <div className="bb-distance-slider">
        <div className="bb-distance-slider-track" aria-hidden="true">
          <div className="bb-distance-slider-fill" style={{ width: `${fillPct}%` }} />
        </div>
        <input
          type="range"
          className="bb-distance-slider-input"
          min={DISTANCE_MIN_KM}
          max={DISTANCE_MAX_KM}
          step={1}
          value={km}
          disabled={disabled}
          aria-valuemin={DISTANCE_MIN_KM}
          aria-valuemax={DISTANCE_MAX_KM}
          aria-valuenow={km}
          aria-valuetext={`${km} km`}
          aria-label="Maximum distance in kilometres"
          onChange={(event) => {
            const next = clampKm(event.target.value);
            onChange?.(next);
          }}
        />
      </div>
      <output className="bb-distance-slider-value" aria-live="polite">
        <span className="bb-distance-slider-value-num">{km}</span>
        <span className="bb-distance-slider-value-unit">km</span>
      </output>
    </div>
  );
}
