import { formatDisplayDate } from '../../../utils/dates';
import { formatTimeValue, parseTimeValue } from '../../../utils/time';

export const ACTIVE = new Set(['pending', 'confirmed', 'waitlist']);
export const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function staffInitials(name = '') {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ''}${parts[1][0] || ''}`.toUpperCase();
}

export function staffPhoto(member) {
  return member?.photoURL || member?.imageUrl || '';
}

export function statusLabel(status) {
  if (status === 'upcoming') return 'Upcoming';
  if (status === 'live') return 'Live';
  if (status === 'ended') return 'Ended';
  return 'Draft';
}

export function formatSessionPart(dateKey, time) {
  if (!dateKey && !time) return '—';
  const datePart = dateKey ? formatDisplayDate(dateKey) : '';
  const timePart = String(time || '').trim();
  if (datePart && timePart) return `${datePart} · ${timePart}`;
  return datePart || timePart || '—';
}

export function formatBookingWindow(booking) {
  const start = String(booking?.time || '').trim();
  if (!start) return '—';
  const minutes = Number(booking?.durationMinutes) || 0;
  if (!minutes) return start;
  const parts = parseTimeValue(start, start);
  const total = parts.hour * 60 + parts.minute + minutes;
  const endHour = Math.floor(total / 60) % 24;
  const endMinute = total % 60;
  return `${start}–${formatTimeValue(endHour, endMinute)}`;
}

export function bookingDateKey(booking) {
  return String(booking?.dateKey || booking?.date || '').trim();
}

export function resolveStaffNames(service, staffList = []) {
  const ids = Array.isArray(service?.staffIds) ? service.staffIds : [];
  if (!ids.length) return [];
  return ids
    .map((id) => staffList.find((member) => member.id === id)?.name)
    .filter(Boolean);
}

export function compareAgendaBookings(a, b, sort = 'oldest') {
  const dateCompare = bookingDateKey(a).localeCompare(bookingDateKey(b));
  const timeCompare = String(a.time || '').localeCompare(String(b.time || ''));
  const chronoCompare = dateCompare || timeCompare;
  if (sort === 'latest') return -chronoCompare || String(b.id || '').localeCompare(String(a.id || ''));
  if (sort === 'client') {
    const byClient = String(a.clientName || '').localeCompare(String(b.clientName || ''), undefined, {
      sensitivity: 'base'
    });
    return byClient || chronoCompare;
  }
  if (sort === 'service') {
    const byService = String(a.serviceName || '').localeCompare(String(b.serviceName || ''), undefined, {
      sensitivity: 'base'
    });
    return byService || chronoCompare;
  }
  return chronoCompare;
}

export function compareSpotServices(a, b, sort = 'oldest') {
  const startCompare = String(a.sessionStartDate || '').localeCompare(String(b.sessionStartDate || ''));
  const timeCompare = String(a.sessionStartTime || '').localeCompare(String(b.sessionStartTime || ''));
  const chronoCompare = startCompare || timeCompare;
  if (sort === 'latest') return -chronoCompare;
  if (sort === 'service') {
    return String(a.name || '').localeCompare(String(b.name || ''), undefined, {
      sensitivity: 'base'
    });
  }
  return chronoCompare;
}

export function serviceOverlapsRange(service, startKey, endKey) {
  const sessionStart = String(service?.sessionStartDate || '').trim();
  const sessionEnd = String(service?.sessionEndDate || sessionStart).trim();
  if (!sessionStart) return false;
  return sessionStart <= endKey && sessionEnd >= startKey;
}
