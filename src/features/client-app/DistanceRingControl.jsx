import { DISTANCE_RINGS_KM } from '../../config/businessCategories';

export function DistanceRingControl({ value = 30, onChange, disabled = false }) {
  const rings = DISTANCE_RINGS_KM;
  const current = rings.includes(Number(value)) ? Number(value) : 30;

  return (
    <div className="bb-distance-rings" role="group" aria-label="Distance from me">
      <span className="bb-distance-rings-label">Within</span>
      <div className="bb-distance-rings-track">
        {rings.map((km) => {
          const active = km === current;
          return (
            <button
              key={km}
              type="button"
              disabled={disabled}
              className={`bb-distance-ring${active ? ' is-active' : ''}`}
              aria-pressed={active}
              onClick={() => onChange?.(km)}
            >
              {km >= 100 ? '100+ km' : `${km} km`}
            </button>
          );
        })}
      </div>
    </div>
  );
}
