import { useMemo } from 'react';

function minutesToLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60) % 24;
  const mins = totalMinutes % 60;
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function buildTimelineAxisMarks(dayStart, dayEnd) {
  const start = Number(dayStart);
  const end = Number(dayEnd);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return [];

  const span = end - start;
  const stepMinutes = span > 10 * 60 ? 120 : 60;
  const marks = [{ minutes: start, edge: 'start' }];

  let cursor = Math.ceil((start + 1) / stepMinutes) * stepMinutes;
  while (cursor < end - 5) {
    marks.push({ minutes: cursor, edge: 'mid' });
    cursor += stepMinutes;
  }
  marks.push({ minutes: end, edge: 'end' });

  return marks.map((mark) => ({
    ...mark,
    label: minutesToLabel(mark.minutes),
    leftPct: ((mark.minutes - start) / span) * 100
  }));
}

function segmentTitle(segment) {
  if (segment.title) return segment.title;
  if (segment.kind === 'break') return `Break ${segment.start}–${segment.end}`;
  if (segment.kind === 'booking') {
    return `Booking ${segment.start}–${segment.end}`;
  }
  return `Shift ${segment.start}–${segment.end}`;
}

/** Shared day timeline meter (Availability + Schedule). */
export function DayTimelineMeter({
  segments = [],
  status = 'open',
  dayStart = 9 * 60,
  dayEnd = 17 * 60,
  showAxis = true
}) {
  const axisMarks = useMemo(
    () => (showAxis ? buildTimelineAxisMarks(dayStart, dayEnd) : []),
    [dayStart, dayEnd, showAxis]
  );

  const meterBody =
    status === 'leave' || status === 'business-closed' ? (
      <span
        className={`bb-schedule-day-meter is-${status === 'leave' ? 'leave' : 'closed'}`}
        aria-hidden="true"
      />
    ) : !segments.length ? (
      <span className="bb-schedule-day-meter is-empty" aria-hidden="true" />
    ) : (
      <span className="bb-schedule-day-meter" aria-hidden="true">
        {segments.map((segment, index) => (
          <i
            key={`${segment.kind}-${segment.start}-${segment.end}-${segment.id || index}`}
            className={`bb-schedule-day-meter-seg is-${segment.kind}`}
            style={{
              left: `${Math.max(0, segment.leftPct)}%`,
              width: `${Math.max(2, segment.widthPct)}%`
            }}
            title={segmentTitle(segment)}
          />
        ))}
      </span>
    );

  return (
    <div className={`bb-schedule-day-meter-wrap${showAxis ? '' : ' is-track-only'}`}>
      {meterBody}
      {axisMarks.length ? (
        <div className="bb-schedule-day-meter-axis" aria-hidden="true">
          {axisMarks.map((mark) => (
            <span
              key={`${mark.minutes}-${mark.edge}`}
              className={`bb-schedule-day-meter-tick is-${mark.edge}`}
              style={{ left: `${mark.leftPct}%` }}
            >
              <i />
              <em>{mark.label}</em>
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}
