import test from 'node:test';
import assert from 'node:assert/strict';
import { buildReportChartGeometry } from '../src/features/analytics/utils/reportChartGeometry.js';

const options = { width: 500, height: 250, pad: { top: 10, right: 10, bottom: 30, left: 50 } };
test('unknown financial intervals break the chart line without pretending to be zero', () => {
  const series = [1000, null, 0, -500, null, 2000].map((amountInCents, index) => ({ at: index * 1000, amountInCents, label: String(index) }));
  const chart = buildReportChartGeometry(series, options);
  assert.equal(chart.missing, 2);
  assert.deepEqual(chart.paths.map(path => path.points.map(point => point.amountInCents)), [[1000], [0, -500], [2000]]);
  assert.equal(chart.knownCoords.length, 4);
  assert.equal(chart.ticksX.at(-1).at, series.at(-1).at, 'Missing dates still occupy their actual time');
  const zero = chart.knownCoords.find(point => point.amountInCents === 0);
  const negative = chart.knownCoords.find(point => point.amountInCents < 0);
  assert.ok(negative.y > zero.y, 'Negative profit sits below the zero baseline');
  assert.ok(chart.paths[1].area.includes(zero.y.toFixed(2)), 'Fill returns to zero rather than the lowest negative value');
});

test('a chart with only missing values has no painted financial observations', () => {
  const chart = buildReportChartGeometry([{ at: 100, amountInCents: null }, { at: 200, amountInCents: null }], options);
  assert.deepEqual(chart.paths, []);
  assert.deepEqual(chart.knownCoords, []);
  assert.equal(chart.missing, 2);
  assert.equal(chart.coords.length, 2);
});
