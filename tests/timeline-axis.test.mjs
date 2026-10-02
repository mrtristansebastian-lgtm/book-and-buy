import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTimelineAxisMarks } from '../src/features/schedule/utils/timelineAxis.js';

test('narrow axes keep endpoints and remove overlapping interior labels', () => {
  assert.deepEqual(buildTimelineAxisMarks(570, 1020, 100).map((mark) => mark.label), ['09:30', '17:00']);
  const marks = buildTimelineAxisMarks(570, 1020, 250);
  for (let index = 1; index < marks.length; index++) {
    assert.ok((marks[index].leftPct - marks[index - 1].leftPct) / 100 * 250 >= 58);
  }
  assert.ok(buildTimelineAxisMarks(540, 1020, 640).length > marks.length);
});
test('invalid or zero-length days have no axis', () => {
  assert.deepEqual(buildTimelineAxisMarks(540, 540), []);
  assert.deepEqual(buildTimelineAxisMarks(NaN, 1020), []);
});
