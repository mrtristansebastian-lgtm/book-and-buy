import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import {
  ANALYTICS_SESSION_IDLE_MS,
  LIVE_COMMERCE_WINDOW_MS,
  LIVE_VISITOR_WINDOW_MS,
  PRESENCE_WRITE_THROTTLE_MS,
  analyticsTimestampMs,
  presenceWriteDue,
  roundApproxCoordinate,
  shouldReuseAnalyticsSession,
  validGeoCoordinates
} from '../src/shared/analytics/livePresence.js';
import {
  clusterLiveSessions,
  projectEqualEarth
} from '../src/features/analytics/utils/liveMapGeometry.js';

const worldMap = JSON.parse(
  await readFile(new URL('../src/features/analytics/assets/worldEqualEarth.json', import.meta.url), 'utf8')
);

test('live windows match the product contract', () => {
  assert.equal(LIVE_VISITOR_WINDOW_MS, 5 * 60 * 1000);
  assert.equal(LIVE_COMMERCE_WINDOW_MS, 10 * 60 * 1000);
});

test('store sessions rotate after thirty minutes of inactivity', () => {
  const now = 10_000_000;
  const stored = { id: 'session-123', startedAt: 1_000, lastActivityAt: now - 5_000 };
  assert.equal(shouldReuseAnalyticsSession(stored, now), true);
  assert.equal(
    shouldReuseAnalyticsSession(
      { ...stored, lastActivityAt: now - ANALYTICS_SESSION_IDLE_MS - 1 },
      now
    ),
    false
  );
});

test('presence writes are shared-throttle safe', () => {
  const now = 5_000_000;
  assert.equal(presenceWriteDue(now - PRESENCE_WRITE_THROTTLE_MS + 1, now), false);
  assert.equal(presenceWriteDue(now - PRESENCE_WRITE_THROTTLE_MS, now), true);
  assert.equal(presenceWriteDue(now, now), false);
});

test('coordinates are rounded and validated without accepting invalid points', () => {
  assert.equal(roundApproxCoordinate(-26.2041), -26.2);
  assert.equal(validGeoCoordinates(-26.2, 28), true);
  assert.equal(validGeoCoordinates(91, 28), false);
  assert.equal(validGeoCoordinates(-26.2, Number.NaN), false);
  assert.equal(validGeoCoordinates(null, null), false);
  assert.equal(projectEqualEarth(null, null, worldMap), null);
});

test('server-like timestamps normalize to milliseconds', () => {
  assert.equal(analyticsTimestampMs({ seconds: 12, nanoseconds: 500_000_000 }), 12_500);
  assert.equal(analyticsTimestampMs({ toMillis: () => 42_000 }), 42_000);
});

test('map projection and clustering stay inside the generated map', () => {
  const center = projectEqualEarth(0, 0, worldMap);
  assert.ok(center);
  assert.ok(Math.abs(center[0] - worldMap.translate[0]) < 0.001);
  assert.ok(Math.abs(center[1] - worldMap.translate[1]) < 0.001);

  const clusters = clusterLiveSessions(
    [
      { id: 'a', latitude: -26.2, longitude: 28, country: 'ZA', lastSeenAt: 2 },
      { id: 'b', latitude: -26.21, longitude: 28.01, country: 'ZA', lastSeenAt: 3 },
      { id: 'c', latitude: 51.5, longitude: -0.1, country: 'GB', lastSeenAt: 1 }
    ],
    worldMap
  );
  assert.equal(clusters.length, 2);
  assert.equal(clusters.find((cluster) => cluster.count === 2)?.latest.id, 'b');
  assert.ok(clusters.every((cluster) => cluster.x >= 0 && cluster.x <= worldMap.width));
  assert.ok(clusters.every((cluster) => cluster.y >= 0 && cluster.y <= worldMap.height));
});

