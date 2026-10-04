import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';
import { FINANCE_METRICS, formatFinanceMetricValue } from '../utils/financeMetrics';
import {
  buildChartGeometry,
  nearestCoordByX
} from '../utils/financeChartScale';

const CHART_PAD_DESKTOP = { top: 18, right: 26, bottom: 40, left: 88 };
const CHART_PAD_MOBILE = { top: 12, right: 18, bottom: 34, left: 80 };

function formatTooltipWhen(at, label) {
  if (!Number.isFinite(at)) return label || '';
  const d = new Date(at);
  const date = d.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
  const time = d.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit'
  });
  return `${date} · ${time}`;
}

function ChartSvg({
  series,
  currency,
  width: fallbackWidth,
  height,
  pad,
  gradientId,
  active,
  onHover,
  onLeave,
  metric = FINANCE_METRICS[0]
}) {
  const svgRef = useRef(null);
  const canvasRef = useRef(null);
  const [width, setWidth] = useState(fallbackWidth);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const measure = () => {
      const next = Math.round(canvas.getBoundingClientRect().width);
      if (next > 0) setWidth(Math.max(160, next));
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fallbackWidth]);
  const geometry = useMemo(
    () => buildChartGeometry(series, { width, height, pad, yTickCount: 5 }),
    [series, width, height, pad]
  );

  const handlePointer = (event) => {
    const svg = svgRef.current;
    if (!svg || !geometry.coords.length) return;
    const rect = svg.getBoundingClientRect();
    const svgX = ((event.clientX - rect.left) / rect.width) * width;
    const point = nearestCoordByX(geometry.coords, svgX);
    onHover?.(point, geometry);
  };

  const { pad: chartPad, plot } = geometry;
  const baseline = chartPad.top + plot.height;

  return (
    <div className="bb-finance-chart-canvas" ref={canvasRef}>
      <svg
        ref={svgRef}
        className="bb-finance-chart-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`${metric.label} over time`}
        onPointerMove={handlePointer}
        onPointerLeave={() => onLeave?.()}
        onPointerDown={handlePointer}
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" className="bb-finance-chart-grad-top" />
            <stop offset="100%" className="bb-finance-chart-grad-bottom" />
          </linearGradient>
        </defs>

        {geometry.ticksY.map((tick) => (
          <g key={`y-${tick.valueCents}`}>
            <line
              x1={chartPad.left}
              x2={width - chartPad.right}
              y1={tick.y}
              y2={tick.y}
              className="bb-finance-chart-grid"
            />
            <text
              x={chartPad.left - 10}
              y={tick.y + 3.5}
              textAnchor="end"
              className="bb-finance-chart-axis bb-finance-chart-axis--y"
            >
              {formatFinanceMetricValue(tick.valueCents, metric.format, currency, { axis: true })}
            </text>
          </g>
        ))}

        <path d={geometry.area} className="bb-finance-chart-area" fill={`url(#${gradientId})`} />
        <path d={geometry.line} className="bb-finance-chart-line" />

        {geometry.ticksX.map((tick) => (
          <text
            key={`x-${tick.at}-${tick.index}`}
            x={tick.x}
            y={height - 12}
            textAnchor={tick.x === geometry.ticksX[0]?.x ? 'start' : tick.x === geometry.ticksX.at(-1)?.x ? 'end' : 'middle'}
            className="bb-finance-chart-axis bb-finance-chart-axis--x"
          >
            {tick.label}
          </text>
        ))}

        {active ? (
          <g className="bb-finance-chart-active" pointerEvents="none">
            <line
              x1={active.x}
              x2={active.x}
              y1={chartPad.top}
              y2={baseline}
              className="bb-finance-chart-guide"
            />
            <circle
              cx={active.x}
              cy={active.y}
              r={6.5}
              className="bb-finance-chart-dot bb-finance-chart-dot--active"
            />
          </g>
        ) : null}

        {/* Invisible hit strip for reliable pointer targeting */}
        <rect
          x={chartPad.left}
          y={chartPad.top}
          width={plot.width}
          height={plot.height}
          fill="transparent"
          className="bb-finance-chart-hit"
        />
      </svg>

      {active ? (
        <div
          className="bb-finance-chart-tooltip"
          style={{
            left: `${Math.min(92, Math.max(8, (active.x / width) * 100))}%`,
            top: `${Math.max(12, (active.y / height) * 100)}%`
          }}
        >
          <div className="bb-finance-chart-tooltip-when">
            {formatTooltipWhen(active.at, active.label)}
          </div>
          <div className="bb-finance-chart-tooltip-value">
            {formatFinanceMetricValue(active.amountInCents, metric.format, currency)}
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function RevenueChart({ series = [], currency = 'R', metric = FINANCE_METRICS[0], unavailableReason = '' }) {
  const [expanded, setExpanded] = useState(false);
  const [active, setActive] = useState(null);
  const [compact, setCompact] = useState(false);
  const gradientId = useId().replace(/:/g, '');
  const dialogRef = useRef(null);
  const triggerRef = useRef(null);
  const wasExpanded = useRef(false);
  const closeChart = () => { setExpanded(false); setActive(null); };
  useDialogFocus(dialogRef, expanded, closeChart);
  useEffect(() => {
    if (wasExpanded.current && !expanded) triggerRef.current?.focus();
    wasExpanded.current = expanded;
  }, [expanded]);
  useEffect(() => setActive(null), [series, metric.id]);

  useEffect(() => {
    const media = window.matchMedia('(max-width: 720px)');
    const sync = () => setCompact(media.matches);
    sync();
    media.addEventListener?.('change', sync);
    return () => media.removeEventListener?.('change', sync);
  }, []);

  const width = expanded ? 960 : compact ? 390 : 640;
  const height = expanded ? 420 : compact ? 260 : 300;
  const moneyPad = expanded || !compact ? CHART_PAD_DESKTOP : CHART_PAD_MOBILE;
  const pad = metric.format === 'count' ? { ...moneyPad, left: compact && !expanded ? 44 : 56 } : moneyPad;

  const chart = (
    <div className={`bb-finance-chart${expanded ? ' is-expanded' : ''}`}>
      <div className="bb-finance-chart-toolbar">
        <div className="bb-finance-chart-copy">
          <h2 className="bb-finance-chart-title">Over time</h2>
          <p className="bb-finance-chart-description">{metric.chartDescription}</p>
        </div>
        <button
          ref={expanded ? undefined : triggerRef}
          type="button"
          className="bb-finance-icon-btn"
          aria-label={expanded ? 'Close chart' : 'Expand chart'}
          onClick={() => { setActive(null); setExpanded((value) => !value); }}
        >
          {expanded ? <X size={16} strokeWidth={2.2} /> : <Maximize2 size={16} strokeWidth={2.2} />}
        </button>
      </div>

      {unavailableReason || !series.length ? (
        <div className="bb-finance-chart-empty">{unavailableReason || metric.emptyLabel}</div>
      ) : (
        <ChartSvg
          series={series}
          currency={currency}
          width={width}
          height={height}
          pad={pad}
          gradientId={`bb-finance-area-${gradientId}`}
          active={active}
          onHover={(point) => setActive(point)}
          onLeave={() => setActive(null)}
          metric={metric}
        />
      )}
    </div>
  );

  if (expanded) {
    return (
      <div
        className="bb-finance-chart-overlay"
        onClick={closeChart}
      >
        <div ref={dialogRef} role="dialog" aria-modal="true" aria-label={`${metric.label} chart`} tabIndex={-1} onClick={(event) => event.stopPropagation()}>{chart}</div>
      </div>
    );
  }

  return chart;
}
