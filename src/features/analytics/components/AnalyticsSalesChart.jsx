import { Button } from '../../../shared/ui/Button';
import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import {
  buildChartGeometry,
  CHART_METRICS,
  chartPointDisplay,
  formatChartValue
} from '../utils/analyticsMetrics';

const PAD_DESKTOP = { top: 18, right: 18, bottom: 40, left: 56 };
const PAD_MOBILE = { top: 12, right: 12, bottom: 34, left: 44 };

export function AnalyticsSalesChart({
  series = [],
  currency = 'R',
  metricId = 'revenue',
  onMetricChange,
  metricOptions = CHART_METRICS,
  showPicker = true
}) {
  const gradientId = useId().replace(/:/g, '');
  const wrapRef = useRef(null);
  const menuRef = useRef(null);
  const [width, setWidth] = useState(640);
  const [active, setActive] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const mobile = width < 560;
  const height = mobile ? 220 : 280;
  const metric = metricOptions.find((m) => m.id === metricId) || metricOptions[0];
  const basePad = mobile ? PAD_MOBILE : PAD_DESKTOP;
  const pad = metric.format === 'money' ? { ...basePad, left: mobile ? 76 : 88 } : basePad;

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return undefined;
    const ro = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect?.width;
      if (w) setWidth(Math.max(160, Math.floor(w)));
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!menuOpen) return undefined;
    const onDoc = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, [menuOpen]);

  const geometry = useMemo(
    () => buildChartGeometry(series, { width, height, pad, yTickCount: 5 }),
    [series, width, height, pad]
  );

  const handlePointer = (event) => {
    const svg = event.currentTarget;
    const rect = svg.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    let best = null;
    let bestDist = Infinity;
    for (const c of geometry.coords || []) {
      const d = Math.abs(c.x - svgX);
      if (d < bestDist) {
        bestDist = d;
        best = c;
      }
    }
    setActive(best);
  };

  const { pad: chartPad, plot } = geometry;
  const baseline = chartPad.top + plot.height;
  const formatTick = (valueCents) =>
    formatChartValue(
      chartPointDisplay({ amountInCents: valueCents }, metric.format),
      metric.format,
      currency
    );

  return (
    <div className="bb-analytics-chart" ref={wrapRef}>
      {showPicker ? <div className="bb-analytics-chart-toolbar" ref={menuRef}>
        <Button action="filter" variant="secondary"
          selected={menuOpen}
          type="button"
          className="bb-analytics-metric-btn"
          aria-haspopup="listbox"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span>{metric.label}</span>
          <ChevronDown size={16} strokeWidth={2.2} aria-hidden="true" />
        </Button>
        {menuOpen ? (
          <ul className="bb-analytics-metric-menu" role="listbox" aria-label="Chart metric">
            {metricOptions.map((option) => (
              <li key={option.id}>
                <button
                  type="button"
                  role="option"
                  aria-selected={option.id === metric.id}
                  className={option.id === metric.id ? 'is-active' : ''}
                  onClick={() => {
                    onMetricChange?.(option.id);
                    setMenuOpen(false);
                    setActive(null);
                  }}
                >
                  {option.label}
                </button>
              </li>
            ))}
          </ul>
        ) : null}
      </div> : null}

      <svg
        className="bb-analytics-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${metric.label} over time`}
        onPointerMove={handlePointer}
        onPointerLeave={() => setActive(null)}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="bb-analytics-chart-grad-top" />
            <stop offset="100%" className="bb-analytics-chart-grad-bottom" />
          </linearGradient>
        </defs>

        {(geometry.ticksY || []).map((tick) => (
          <g key={`y-${tick.valueCents}`}>
            <line
              x1={chartPad.left}
              x2={width - chartPad.right}
              y1={tick.y}
              y2={tick.y}
              className="bb-analytics-chart-grid"
            />
            <text
              x={chartPad.left - 8}
              y={tick.y + 4}
              textAnchor="end"
              className="bb-analytics-chart-axis"
            >
              {formatTick(tick.valueCents)}
            </text>
          </g>
        ))}

        {geometry.area ? (
          <path d={geometry.area} className="bb-analytics-chart-area" fill={`url(#${gradientId})`} />
        ) : null}
        {geometry.line ? <path d={geometry.line} className="bb-analytics-chart-line" /> : null}

        {(geometry.ticksX || []).map((tick) => (
          <text
            key={`x-${tick.at}`}
            x={tick.x}
            y={baseline + 22}
            textAnchor={tick.x === geometry.ticksX[0]?.x ? 'start' : tick.x === geometry.ticksX.at(-1)?.x ? 'end' : 'middle'}
            className="bb-analytics-chart-axis"
          >
            {tick.label}
          </text>
        ))}

        {active ? (
          <g pointerEvents="none">
            <line
              x1={active.x}
              x2={active.x}
              y1={chartPad.top}
              y2={baseline}
              className="bb-analytics-chart-guide"
            />
            <circle cx={active.x} cy={active.y} r="5" className="bb-analytics-chart-dot" />
          </g>
        ) : null}
      </svg>

      {active ? (
        <div className="bb-analytics-chart-tooltip">
          <div className="bb-analytics-chart-tooltip-when">{active.label}</div>
          <div className="bb-analytics-chart-tooltip-value">
            {formatChartValue(
              chartPointDisplay(active, metric.format),
              metric.format,
              currency
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
