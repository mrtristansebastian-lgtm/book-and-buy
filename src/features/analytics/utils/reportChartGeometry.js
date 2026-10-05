import { buildChartGeometry } from '../../finance/utils/financeChartScale.js';

/** Missing rates/costs break the line; they never become zero-valued observations. */
export function buildReportChartGeometry(series = [], options = {}) {
  const geometry = buildChartGeometry(series, options);
  const segments = [];
  let segment = [];
  for (const point of geometry.coords) {
    if (point.amountInCents != null && Number.isFinite(Number(point.amountInCents))) segment.push(point);
    else if (segment.length) { segments.push(segment); segment = []; }
  }
  if (segment.length) segments.push(segment);
  const domain = Math.max(geometry.niceMaxCents - (geometry.niceMinCents || 0), 1);
  const baseline = geometry.pad.top + geometry.plot.height - (-(geometry.niceMinCents || 0) / domain) * geometry.plot.height;
  const paths = segments.map(points => {
    const line = points.map((point, index) => `${index ? 'L' : 'M'} ${point.x.toFixed(2)} ${point.y.toFixed(2)}`).join(' ');
    return { line, area: `${line} L ${points.at(-1).x.toFixed(2)} ${baseline.toFixed(2)} L ${points[0].x.toFixed(2)} ${baseline.toFixed(2)} Z`, points };
  });
  return { ...geometry, paths, knownCoords: segments.flat(), missing: geometry.coords.length - segments.flat().length };
}
