import { useMemo } from 'react';
import { useElementWidth } from '../../../shared/ui/useElementWidth';
import { buildTimelineAxisMarks } from '../utils/timelineAxis';
export { buildTimelineAxisMarks } from '../utils/timelineAxis';

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
  const [meterRef, width] = useElementWidth();
  const axisMarks = useMemo(
    () => (showAxis ? buildTimelineAxisMarks(dayStart, dayEnd, width || 120) : []),
    [dayStart, dayEnd, showAxis, width]
  );

  const meterBody =
    status === 'leave' || status === 'off' || status === 'business-closed' ? (
      <span
        className={`bb-schedule-day-meter is-${
          status === 'leave' ? 'leave' : status === 'off' ? 'off' : 'closed'
        }`}
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
    <div ref={meterRef} className={`bb-schedule-day-meter-wrap${showAxis ? '' : ' is-track-only'}`}>
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
