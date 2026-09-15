/** Circular progress used on thumbnails and next to character counts. */
export function ProgressRing({ value = 0, size = 30, tone = 'upload', children }) {
  const radius = (size - 4) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = Math.max(0, Math.min(1, value));
  return (
    <span
      className={`bb-composer-ring bb-composer-ring--${tone}`}
      style={{ width: `${size}px`, height: `${size}px` }}
    >
      <svg viewBox={`0 0 ${size} ${size}`} aria-hidden="true">
        <circle className="bb-composer-ring-track" cx={size / 2} cy={size / 2} r={radius} />
        <circle
          className="bb-composer-ring-fill"
          cx={size / 2}
          cy={size / 2}
          r={radius}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - clamped)}
        />
      </svg>
      {children ? <span className="bb-composer-ring-label">{children}</span> : null}
    </span>
  );
}
