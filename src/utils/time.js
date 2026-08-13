/** HH:MM helpers for TimeField and schedule editors. */

export const padTimePart = (value) => String(Math.max(0, Number(value) || 0)).padStart(2, '0');

export const parseTimeValue = (value = '', fallback = '09:00') => {
  const raw = String(value || '').trim();
  const match = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    const fallbackMatch = String(fallback).match(/^(\d{1,2}):(\d{2})$/);
    if (!fallbackMatch) return { hour: 9, minute: 0 };
    return {
      hour: Math.min(23, Math.max(0, Number(fallbackMatch[1]))),
      minute: Math.min(59, Math.max(0, Number(fallbackMatch[2])))
    };
  }
  return {
    hour: Math.min(23, Math.max(0, Number(match[1]))),
    minute: Math.min(59, Math.max(0, Number(match[2])))
  };
};

export const formatTimeValue = (hour = 0, minute = 0) =>
  `${padTimePart(hour)}:${padTimePart(minute)}`;

export const snapMinute = (minute = 0, step = 5) => {
  const safeStep = Math.max(1, Number(step) || 5);
  const snapped = Math.round(Number(minute) / safeStep) * safeStep;
  if (snapped >= 60) return 60 - safeStep;
  return Math.max(0, snapped);
};

export const buildMinuteOptions = (step = 5) => {
  const safeStep = Math.max(1, Number(step) || 5);
  const out = [];
  for (let minute = 0; minute < 60; minute += safeStep) out.push(minute);
  return out;
};

export const HOUR_OPTIONS = Array.from({ length: 24 }, (_, hour) => hour);
