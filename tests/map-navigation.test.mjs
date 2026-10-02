import test from 'node:test';
import assert from 'node:assert/strict';
import { fitViewport, navigateMapGesture, screenToMap } from '../src/features/analytics/utils/mapViewport.js';
import fs from 'node:fs';
import { WORLD_MAP_FRAME } from '../src/features/analytics/utils/worldMapFrame.js';

test('the tighter fitted world frame contains every committed coastline with breathing room', () => {
  const map = JSON.parse(fs.readFileSync(new URL('../src/features/analytics/assets/worldEqualEarth.json', import.meta.url)));
  const b = WORLD_MAP_FRAME;
  const view = fitViewport(b.width, b.height, 1, undefined, b);
  assert.equal(view.x - view.width / 2, b.x);
  assert.equal(view.y - view.height / 2, b.y);
  for (const area of map.countries) for (const match of area.path.matchAll(/(?:M|L)(-?[\d.]+),(-?[\d.]+)/g)) {
    const x = Number(match[1]); const y = Number(match[2]);
    assert.ok(x >= b.x + 10 && x <= b.x + b.width - 10, area.name);
    assert.ok(y >= b.y + 10 && y <= b.y + b.height - 10, area.name);
  }
});
test('pan respects a non-zero fitted frame origin', () => {
  const b = WORLD_MAP_FRAME;
  const rect = { left: 0, top: 0, width: b.width, height: b.height };
  const next = navigateMapGesture({ ...b, origin: b, view: fitViewport(b.width, b.height, 2, undefined, b), rect, from: { x: 300, y: 200 }, to: { x: -5000, y: 5000 } });
  assert.equal(next.x + next.width / 2, b.x + b.width);
  assert.equal(next.y - next.height / 2, b.y);
});
test('pinch preserves the geographic anchor through letterboxing and moving fingers', () => {
  for (const rect of [{ left: 0, top: 0, width: 390, height: 250 }, { left: 50, top: 150, width: 1200, height: 600 }]) {
    const view = fitViewport(1000, 500, 1.35);
    const from = { x: rect.left + rect.width * .55, y: rect.top + rect.height * .55 };
    const to = { x: from.x + 10, y: from.y - 10 };
    const next = navigateMapGesture({ width: 1000, height: 500, view, rect, from, to, ratio: 1.6 });
    const before = screenToMap(from, rect, view); const after = screenToMap(to, rect, next);
    assert.ok(Math.hypot(before.x - after.x, before.y - after.y) < .000001);
  }
});
test('drag and pinch remain within the country/world bounds and zoom limits', () => {
  const rect = { left: 0, top: 0, width: 1000, height: 500 };
  for (const ratio of [.01, 1, 100]) {
    const next = navigateMapGesture({ width: 1000, height: 500, view: fitViewport(1000, 500, 2), rect, from: { x: 500, y: 250 }, to: { x: -9000, y: 9000 }, ratio });
    assert.ok(next.zoom >= 1 && next.zoom <= 4);
    assert.ok(next.x >= next.width / 2 && next.x <= 1000 - next.width / 2);
    assert.ok(next.y >= next.height / 2 && next.y <= 500 - next.height / 2);
  }
});
