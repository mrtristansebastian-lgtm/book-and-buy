export const timeToMinutes = (hhmm = '') => {
  const match = String(hhmm || '').match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
  return hours * 60 + minutes;
};

export const resolveTimeWindowMinutes = (
  startTime,
  endTime,
  { fallbackStart = 9 * 60, fallbackEnd = 17 * 60 } = {}
) => {
  const start = timeToMinutes(startTime) ?? fallbackStart;
  let end = timeToMinutes(endTime) ?? fallbackEnd;
  if (end <= start) end += 24 * 60;
  return { start, end, span: Math.max(1, end - start) };
};

export const alignTimeToWindowMinutes = (minutes, windowStart, windowEnd) => {
  if (!Number.isFinite(minutes)) return null;
  let aligned = minutes;
  if (windowEnd > 24 * 60 && aligned < windowStart) aligned += 24 * 60;
  return aligned;
};

export const minutesToTime = (totalMinutes) => {
  const dayMinutes = 24 * 60;
  const normalized = ((Math.round(totalMinutes) % dayMinutes) + dayMinutes) % dayMinutes;
  const hours = Math.floor(normalized / 60);
  const minutes = normalized % 60;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
};
