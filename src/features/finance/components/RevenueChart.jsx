import { useMemo, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { formatMoney } from '../utils/financeLedger';

function buildPath(points, width, height, pad) {
  if (!points.length) return '';
  const maxY = Math.max(...points.map((p) => p.amountInCents), 1);
  const minX = 0;
  const maxX = Math.max(points.length - 1, 1);

  const coords = points.map((point, index) => {
    const x = pad + ((index - minX) / maxX) * (width - pad * 2);
    const y = height - pad - (point.amountInCents / maxY) * (height - pad * 2);
    return { x, y, ...point };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(1)} ${c.y.toFixed(1)}`)
    .join(' ');
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(1)} ${(height - pad).toFixed(1)} L ${coords[0].x.toFixed(1)} ${(height - pad).toFixed(1)} Z`;
  return { line, area, coords, maxY };
}

export function RevenueChart({ series = [], currency = 'R' }) {
  const [expanded, setExpanded] = useState(false);
  const width = 640;
  const height = 280;
  const pad = 28;

  const geometry = useMemo(
    () => buildPath(series, width, height, pad),
    [series]
  );

  const chart = (
    <div className={`bb-finance-chart${expanded ? ' is-expanded' : ''}`}>
      <div className="bb-finance-chart-toolbar">
        <button
          type="button"
          className="bb-finance-icon-btn"
          aria-label={expanded ? 'Close chart' : 'Expand chart'}
          onClick={() => setExpanded((value) => !value)}
        >
          {expanded ? <X size={16} strokeWidth={2.2} /> : <Maximize2 size={16} strokeWidth={2.2} />}
        </button>
      </div>

      {!series.length ? (
        <div className="bb-finance-chart-empty">No paid revenue in this period yet.</div>
      ) : (
        <svg
          className="bb-finance-chart-svg"
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="Revenue over time"
        >
          {[0, 0.25, 0.5, 0.75, 1].map((tick) => {
            const y = height - pad - tick * (height - pad * 2);
            const value = Math.round(geometry.maxY * tick);
            return (
              <g key={tick}>
                <line
                  x1={pad}
                  x2={width - pad}
                  y1={y}
                  y2={y}
                  className="bb-finance-chart-grid"
                />
                <text x={8} y={y + 4} className="bb-finance-chart-axis">
                  {formatMoney(value, currency)}
                </text>
              </g>
            );
          })}

          <path d={geometry.area} className="bb-finance-chart-area" />
          <path d={geometry.line} className="bb-finance-chart-line" />

          {geometry.coords.map((point) => (
            <circle
              key={point.at}
              cx={point.x}
              cy={point.y}
              r={5}
              className="bb-finance-chart-dot"
            />
          ))}

          {geometry.coords
            .filter((_, index, all) => index === 0 || index === all.length - 1 || index % 2 === 0)
            .map((point) => (
              <text
                key={`label-${point.at}`}
                x={point.x}
                y={height - 8}
                textAnchor="middle"
                className="bb-finance-chart-axis"
              >
                {point.label}
              </text>
            ))}
        </svg>
      )}
    </div>
  );

  if (expanded) {
    return (
      <div className="bb-finance-chart-overlay" onClick={() => setExpanded(false)}>
        <div onClick={(event) => event.stopPropagation()}>{chart}</div>
      </div>
    );
  }

  return chart;
}
