import test from 'node:test';
import assert from 'node:assert/strict';
import { fitViewport, navigateMapGesture, screenToMap } from '../src/features/analytics/utils/mapViewport.js';
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
