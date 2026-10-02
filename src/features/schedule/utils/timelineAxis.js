export function buildTimelineAxisMarks(dayStart, dayEnd, width = 480) {
  const start = Number(dayStart); const end = Number(dayEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];
  const span = end - start;
  const intervals = Math.max(1, Math.min(8, Math.floor(Math.max(1, width) / 58)));
  const minimumGap = span / intervals;
  const step = [30, 60, 120, 180, 240, 360, 720, 1440].find((value) => value >= minimumGap) || 1440;
  const marks = [{ minutes: start, edge: 'start' }];
  for (let cursor = Math.ceil((start + 1) / step) * step; cursor < end; cursor += step) {
    if (cursor - marks.at(-1).minutes >= minimumGap && end - cursor >= minimumGap) marks.push({ minutes: cursor, edge: 'mid' });
  }
  marks.push({ minutes: end, edge: 'end' });
  return marks.map((mark) => ({ ...mark,
    label: `${String(Math.floor(mark.minutes / 60) % 24).padStart(2, '0')}:${String(mark.minutes % 60).padStart(2, '0')}`,
    leftPct: ((mark.minutes - start) / span) * 100 }));
}
