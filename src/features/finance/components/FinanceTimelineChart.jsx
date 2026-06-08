import { useState } from 'react';
import { Maximize2, X } from 'lucide-react';
import { formatCompactMoney, formatMoney } from '../utils/financeMetrics';

export const FinanceTimelineChart = ({ buckets = [], currency = 'ZAR', statItems = [] }) => {
  const [chartExpanded, setChartExpanded] = useState(false);
  const safeBuckets = buckets.length ? buckets : [{ label: 'No data', rangeLabel: 'No paid records', value: 0, count: 0 }];
  const chartWidth = 640;
  const chartHeight = 360;
  const padding = { top: 34, right: 24, bottom: 64, left: 118 };
  const plotWidth = chartWidth - padding.left - padding.right;
  const plotHeight = chartHeight - padding.top - padding.bottom;
  const totalValue = safeBuckets.reduce((sum, bucket) => sum + Number(bucket.value || 0), 0);
  const chartMax = Math.max(totalValue, 1);
  const xLabelIndexes = safeBuckets.length <= 6
    ? safeBuckets.map((_, index) => index)
    : [0, 0.25, 0.5, 0.75, 1]
      .map((ratio) => Math.round((safeBuckets.length - 1) * ratio))
      .filter((index, position, indexes) => index >= 0 && index < safeBuckets.length && indexes.indexOf(index) === position);
  let cumulativeValue = 0;
  const points = safeBuckets.map((bucket, index) => {
    cumulativeValue += Number(bucket.value || 0);
    const x = padding.left + (safeBuckets.length === 1 ? plotWidth / 2 : (index / (safeBuckets.length - 1)) * plotWidth);
    const y = padding.top + plotHeight - ((cumulativeValue / chartMax) * plotHeight);
    return { ...bucket, rawValue: Number(bucket.value || 0), cumulativeValue, x, y };
  });
  const linePath = points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
  const areaPath = `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${(padding.top + plotHeight).toFixed(2)} L ${points[0].x.toFixed(2)} ${(padding.top + plotHeight).toFixed(2)} Z`;
  const yTicks = totalValue > 0
    ? [totalValue, totalValue * 0.75, totalValue * 0.5, totalValue * 0.25, 0].map((value) => Math.round(value))
    : [0];
  const peakPointIndex = points.reduce((latestIndex, point, index) => (
    Number(point.cumulativeValue || 0) > 0 ? index : latestIndex
  ), 0);
  const summaryItems = statItems.length ? statItems : [
    { label: 'Total Revenue', value: formatMoney(totalValue, currency), caption: 'Paid revenue' },
    { label: 'Average Monthly Revenue', value: formatMoney(totalValue, currency), caption: 'Across paid months' },
    { label: 'Pending Payments', value: formatMoney(0, currency), caption: 'Awaiting confirmation' }
  ];
  const renderChartSvg = (idPrefix = 'financeTimeline') => (
    <svg className="h-full w-full" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Cumulative paid revenue over time">
      <title>Cumulative paid revenue over time</title>
      <defs>
        <linearGradient id={`${idPrefix}Area`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#14b8a6" stopOpacity="0.22" />
          <stop offset="58%" stopColor="#14b8a6" stopOpacity="0.09" />
          <stop offset="100%" stopColor="#14b8a6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id={`${idPrefix}Line`} x1="0" x2="1" y1="0" y2="0">
          <stop offset="0%" stopColor="#111827" />
          <stop offset="45%" stopColor="#0f9f8f" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>

      {yTicks.map((tick, index) => {
        const y = padding.top + plotHeight - ((tick / chartMax) * plotHeight);
        const isZero = tick === 0;
        const label = index === 0 && totalValue > 0 ? formatMoney(tick, currency) : formatCompactMoney(tick, currency);
        return (
          <g key={`${tick}-${index}`}>
            <line className={isZero ? 'finance-axis-baseline' : 'finance-grid-line'} x1={padding.left} x2={chartWidth - padding.right} y1={y} y2={y} />
            <text className="finance-axis-label finance-axis-label-y" x={padding.left - 18} y={y + 7} textAnchor="end">
              {label}
            </text>
          </g>
        );
      })}

      <line className="finance-axis-line" x1={padding.left} x2={padding.left} y1={padding.top} y2={padding.top + plotHeight} />
      <line className="finance-axis-line" x1={padding.left} x2={chartWidth - padding.right} y1={padding.top + plotHeight} y2={padding.top + plotHeight} />

      <path d={areaPath} fill={`url(#${idPrefix}Area)`} />
      <path className="finance-chart-line-shadow" d={linePath} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      <path className="finance-chart-line" d={linePath} fill="none" stroke={`url(#${idPrefix}Line)`} strokeLinecap="round" strokeLinejoin="round" />

      {xLabelIndexes.map((index) => {
        const point = points[index];
        if (!point) return null;
        return (
          <g key={`x-axis-${point.label}-${index}`}>
            <line className="finance-x-axis-tick" x1={point.x} x2={point.x} y1={padding.top + plotHeight} y2={padding.top + plotHeight + 8} />
            <text
              className="finance-axis-label finance-axis-label-x"
              x={point.x}
              y={chartHeight - 24}
              textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}
            >
              {point.label}
            </text>
          </g>
        );
      })}

      {points.map((point, index) => {
        const isPeak = index === peakPointIndex && Number(point.cumulativeValue || 0) > 0;
        const hasValue = Number(point.cumulativeValue || 0) > 0;
        return (
          <g key={`${point.label}-${point.startMs || index}`}>
            {hasValue && (
              <>
                <circle className="finance-chart-hit-dot" cx={point.x} cy={point.y} r="13">
                  <title>{`${point.rangeLabel || point.label}: ${formatMoney(point.rawValue || 0, currency)} from ${point.count || 0} paid booking${point.count === 1 ? '' : 's'} · ${formatMoney(point.cumulativeValue || 0, currency)} cumulative`}</title>
                </circle>
                <circle className={`finance-chart-dot ${isPeak ? 'is-peak' : ''}`} cx={point.x} cy={point.y} r={isPeak ? 7 : 4.8} />
              </>
            )}
          </g>
        );
      })}
    </svg>
  );

  return (
    <div className="finance-timeline-chart rounded-[1.35rem] border border-neutral-100 bg-white p-3 md:p-4">
      <div className="finance-timeline-statbar grid grid-cols-1 sm:grid-cols-3 gap-px overflow-hidden rounded-2xl border border-neutral-100 bg-neutral-100 mb-4">
        {summaryItems.map(({ label, value }) => (
          <div key={label} className="bg-white px-4 py-3">
            <p className="text-[8px] font-black uppercase tracking-widest text-neutral-400">{label}</p>
            <p className="mt-1 text-lg md:text-xl font-black tracking-tight text-black truncate">{value}</p>
          </div>
        ))}
      </div>

      <div className="finance-chart-module">
        <button type="button" onClick={() => setChartExpanded(true)} aria-label="Open finance chart fullscreen" className="finance-chart-expand-button">
          <Maximize2 size={15} />
          <span>Fullscreen</span>
        </button>
        <div className="finance-timeline-canvas h-[20rem] rounded-[1.15rem] border border-neutral-100 bg-[#FBFCFE] overflow-hidden">
          {renderChartSvg('financeTimeline')}
        </div>
      </div>
      {chartExpanded && (
        <div className="finance-chart-fullscreen fixed inset-0 z-[1600] bg-white p-4 md:p-8">
          <div className="finance-chart-fullscreen-panel">
            <div className="finance-chart-fullscreen-head">
              <div>
                <p>Finance chart</p>
                <h3>Cumulative revenue</h3>
              </div>
              <button type="button" onClick={() => setChartExpanded(false)} aria-label="Close fullscreen finance chart">
                <X size={18} />
              </button>
            </div>
            <div className="finance-timeline-canvas finance-timeline-canvas-fullscreen">
              {renderChartSvg('financeTimelineExpanded')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
