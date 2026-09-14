/**
 * Chart geometry helpers: nice Y scales + time-linear X mapping.
 * Amounts stay in cents; axis ticks are whole currency units only.
 */

function niceNum(range, round) {
  const safe = Math.max(range, Number.EPSILON);
  const exp = Math.floor(Math.log10(safe));
  const frac = safe / 10 ** exp;
  let nice;
  if (round) {
    if (frac < 1.5) nice = 1;
    else if (frac < 3) nice = 2;
    else if (frac < 7) nice = 5;
    else nice = 10;
  } else if (frac <= 1) nice = 1;
  else if (frac <= 2) nice = 2;
  else if (frac <= 5) nice = 5;
  else nice = 10;
  return nice * 10 ** exp;
}

/**
 * Build a 0 → niceMax domain in cents with ~tickCount major ticks.
 * Ticks are always whole currency units (never fractional majors / cents on the axis).
 * @returns {{ niceMaxCents: number, ticksCents: number[], stepCents: number }}
 */
export function niceScale(maxCents = 0, tickCount = 5) {
  const peak = Math.max(0, Number(maxCents) || 0);
  if (peak <= 0) {
    return { niceMaxCents: 100, ticksCents: [0, 100], stepCents: 100 };
  }

  // Floor domain to at least 1 major unit so axis labels stay whole-currency.
  const maxUnits = Math.max(1, peak / 100);
  const roughStep = maxUnits / Math.max(tickCount - 1, 1);
  let stepUnits = niceNum(roughStep, true);
  if (stepUnits < 1) stepUnits = 1;
  const niceMaxUnits = Math.ceil(maxUnits / stepUnits) * stepUnits;
  const stepCents = Math.round(stepUnits * 100);
  const niceMaxCents = Math.round(niceMaxUnits * 100);

  const ticksCents = [];
  for (let v = 0; v <= niceMaxCents + 0.5; v += stepCents) {
    ticksCents.push(Math.round(v));
  }
  if (ticksCents[ticksCents.length - 1] !== niceMaxCents) {
    ticksCents.push(niceMaxCents);
  }

  return { niceMaxCents, ticksCents, stepCents };
}

function normalizePad(pad) {
  if (typeof pad === 'number') {
    return { top: pad, right: pad, bottom: pad, left: pad };
  }
  return {
    top: pad?.top ?? 16,
    right: pad?.right ?? 16,
    bottom: pad?.bottom ?? 36,
    left: pad?.left ?? 64
  };
}

/**
 * Pick up to maxLabels X tick indices without crowding (min px gap).
 */
function pickXTickIndices(coords, maxLabels = 5, minGapPx = 72) {
  if (!coords.length) return [];
  if (coords.length === 1) return [0];

  const last = coords.length - 1;
  const chosen = [0];
  const targetCount = Math.min(maxLabels, coords.length);

  if (targetCount === 2) {
    chosen.push(last);
    return chosen;
  }

  for (let i = 1; i < targetCount - 1; i += 1) {
    const ideal = Math.round((i / (targetCount - 1)) * last);
    let best = ideal;
    let bestDist = Infinity;
    for (let j = 1; j < last; j += 1) {
      const dist = Math.abs(j - ideal);
      if (dist < bestDist) {
        bestDist = dist;
        best = j;
      }
    }
    if (!chosen.includes(best)) chosen.push(best);
  }
  chosen.push(last);
  chosen.sort((a, b) => a - b);

  const filtered = [chosen[0]];
  for (let i = 1; i < chosen.length; i += 1) {
    const prev = filtered[filtered.length - 1];
    const idx = chosen[i];
    const isLast = i === chosen.length - 1;
    if (isLast) {
      if (coords[idx].x - coords[prev].x < minGapPx * 0.65) {
        if (filtered.length > 1) filtered[filtered.length - 1] = idx;
        else filtered.push(idx);
      } else {
        filtered.push(idx);
      }
    } else if (coords[idx].x - coords[prev].x >= minGapPx) {
      filtered.push(idx);
    }
  }
  return filtered;
}

/**
 * Map series points onto SVG space with time-linear X and nice Y.
 * @param {Array<{ at: number, amountInCents: number, label?: string }>} series
 * @param {{ width: number, height: number, pad?: number|object, yTickCount?: number }} opts
 */
export function buildChartGeometry(series = [], { width, height, pad, yTickCount = 5 } = {}) {
  const p = normalizePad(pad);
  const plotW = Math.max(width - p.left - p.right, 1);
  const plotH = Math.max(height - p.top - p.bottom, 1);

  if (!series.length) {
    return {
      line: '',
      area: '',
      coords: [],
      ticksY: [],
      ticksX: [],
      niceMaxCents: 0,
      pad: p,
      plot: { x: p.left, y: p.top, width: plotW, height: plotH }
    };
  }

  const maxCents = Math.max(...series.map((pt) => Number(pt.amountInCents) || 0), 0);
  const { niceMaxCents, ticksCents } = niceScale(maxCents, yTickCount);

  const t0 = Number(series[0].at) || 0;
  const t1 = Number(series[series.length - 1].at) || t0;
  const tSpan = Math.max(t1 - t0, 1);

  const coords = series.map((point) => {
    const t = Number(point.at) || t0;
    const x = p.left + ((t - t0) / tSpan) * plotW;
    const y = p.top + plotH - ((Number(point.amountInCents) || 0) / niceMaxCents) * plotH;
    return { x, y, ...point };
  });

  const line = coords
    .map((c, i) => `${i === 0 ? 'M' : 'L'} ${c.x.toFixed(2)} ${c.y.toFixed(2)}`)
    .join(' ');
  const baseline = (p.top + plotH).toFixed(2);
  const area = `${line} L ${coords[coords.length - 1].x.toFixed(2)} ${baseline} L ${coords[0].x.toFixed(2)} ${baseline} Z`;

  const ticksY = ticksCents.map((valueCents) => ({
    valueCents,
    y: p.top + plotH - (valueCents / niceMaxCents) * plotH
  }));

  const xIndices = pickXTickIndices(coords);
  const ticksX = xIndices.map((index) => ({
    index,
    x: coords[index].x,
    at: coords[index].at,
    label: coords[index].label
  }));

  return {
    line,
    area,
    coords,
    ticksY,
    ticksX,
    niceMaxCents,
    pad: p,
    plot: { x: p.left, y: p.top, width: plotW, height: plotH }
  };
}

/** Nearest series coordinate by SVG X (for hover). */
export function nearestCoordByX(coords = [], svgX = 0) {
  if (!coords.length) return null;
  let best = coords[0];
  let bestDist = Math.abs(coords[0].x - svgX);
  for (let i = 1; i < coords.length; i += 1) {
    const dist = Math.abs(coords[i].x - svgX);
    if (dist < bestDist) {
      best = coords[i];
      bestDist = dist;
    }
  }
  return best;
}
