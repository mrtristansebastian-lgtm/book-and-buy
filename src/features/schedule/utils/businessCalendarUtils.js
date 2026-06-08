import { getLocalDateStr } from '../../../utils/dates';

const monthLookup = {
    jan: 0, january: 0, feb: 1, february: 1, mar: 2, march: 2, apr: 3, april: 3,
    may: 4, jun: 5, june: 5, jul: 6, july: 6, aug: 7, august: 7,
    sep: 8, sept: 8, september: 8, oct: 9, october: 9, nov: 10, november: 10, dec: 11, december: 11
};

export const getStaffDisplayName = (staff = {}) => staff.name || staff.displayName || staff.email?.split('@')[0] || 'Team member';

export const getStaffUsername = (staff = {}) => staff.username || staff.handle || (staff.email ? `@${staff.email.split('@')[0]}` : `${staff.role || 'staff'} calendar`);

export const getStaffInitials = (name = 'Team member') => name.split(' ').map(part => part.charAt(0)).join('').slice(0, 2).toUpperCase();

export const normalizeEmailKey = (value = '') => String(value || '').trim().toLowerCase();

export const normalizePhoneKey = (value = '') => String(value || '').replace(/\D/g, '');

export const findBookingClientProfile = (booking = {}, clientDirectory = []) => {
    const emailKey = normalizeEmailKey(booking.clientEmail || booking.email || '');
    const phoneKey = normalizePhoneKey(booking.clientPhone || booking.phone || '');
    const nameKey = String(booking.clientName || '').trim().toLowerCase();
    return clientDirectory.find(client => (
        (emailKey && normalizeEmailKey(client.email || '') === emailKey) ||
        (phoneKey && normalizePhoneKey(client.phone || '') === phoneKey) ||
        (nameKey && String(client.name || '').trim().toLowerCase() === nameKey)
    )) || null;
};

export const getBookingClientAvatar = (booking = {}, clientDirectory = []) => (
    booking.clientPhotoURL ||
    booking.clientAvatar ||
    booking.avatar ||
    findBookingClientProfile(booking, clientDirectory)?.avatar ||
    ''
);

export const dateFromKey = (dateStr) => new Date(`${dateStr}T00:00:00`);

export const addDaysToDate = (date, days) => {
    const nextDate = new Date(date);
    nextDate.setDate(nextDate.getDate() + days);
    return nextDate;
};

export const getDateRange = (startDate, endDate) => {
    const dates = [];
    const cursor = new Date(startDate);
    while (cursor <= endDate) {
        dates.push(getLocalDateStr(cursor));
        cursor.setDate(cursor.getDate() + 1);
    }
    return dates;
};

export const formatCompactDate = (date) => date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

export const getBookingDateKey = (booking = {}, { todayStr, currentMonth = new Date() } = {}) => {
    if (booking.dateKey) return booking.dateKey;
    const rawDate = String(booking.date || '').trim();
    if (!rawDate) return null;
    if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
    if (/^today$/i.test(rawDate)) return todayStr;
    if (/^tomorrow$/i.test(rawDate)) {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return getLocalDateStr(tomorrow);
    }

    const dayMonthMatch = rawDate.match(/(?:mon|tue|wed|thu|fri|sat|sun)?[a-z]*,?\s*(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/i);
    if (dayMonthMatch) {
        const day = Number(dayMonthMatch[1]);
        const month = monthLookup[dayMonthMatch[2].toLowerCase()];
        const year = Number(dayMonthMatch[3]) || currentMonth.getFullYear();
        if (!Number.isNaN(day) && month !== undefined) return getLocalDateStr(new Date(year, month, day));
    }

    const parsed = new Date(rawDate);
    return Number.isNaN(parsed.getTime()) ? null : getLocalDateStr(parsed);
};

export const getNextOpenTime = (existingTimes = []) => {
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const nextHalfHour = Math.ceil((currentMinutes + 1) / 30) * 30;
    for (let i = 0; i < 48; i++) {
        const minutes = (nextHalfHour + i * 30) % (24 * 60);
        const hour = String(Math.floor(minutes / 60)).padStart(2, '0');
        const minute = String(minutes % 60).padStart(2, '0');
        const candidate = `${hour}:${minute}`;
        if (!existingTimes.includes(candidate)) return candidate;
    }
    return '18:00';
};

export const getSlotStartMinutes = (slot = '') => {
    const match = String(slot).match(/(\d{1,2}):(\d{2})/);
    if (!match) return 9999;
    return (Number(match[1]) * 60) + Number(match[2]);
};

export const parseSlotValue = (slot = '') => {
    const raw = String(slot || '').trim();
    const rangeMatch = raw.match(/^(.+?)\s*(?:-|\bto\b)\s*(.+)$/i);
    if (rangeMatch) {
        return {
            mode: 'range',
            start: rangeMatch[1].trim(),
            end: rangeMatch[2].trim()
        };
    }
    return { mode: 'single', start: raw, end: '' };
};

export const formatSlotEditorValue = (editor = {}) => {
    const start = String(editor.start || '').trim();
    const end = String(editor.end || '').trim();
    if (editor.mode === 'range' && end) return `${start} - ${end}`;
    return start;
};

export const toTimeParts = (value = '', fallback = '09:00') => {
    const source = String(value || fallback || '09:00');
    const match = source.match(/^(\d{1,2}):(\d{2})/);
    const rawHour = match ? Number(match[1]) : 9;
    const rawMinute = match ? Number(match[2]) : 0;
    return {
        hour: Math.min(23, Math.max(0, Number.isFinite(rawHour) ? rawHour : 9)),
        minute: Math.min(59, Math.max(0, Number.isFinite(rawMinute) ? rawMinute : 0))
    };
};

export const timePartsToValue = ({ hour = 9, minute = 0 } = {}) => (
    `${String(Math.min(23, Math.max(0, hour))).padStart(2, '0')}:${String(Math.min(59, Math.max(0, minute))).padStart(2, '0')}`
);

export const timeValueToMinutes = (value = '', fallback = '09:00') => {
    const { hour, minute } = toTimeParts(value, fallback);
    return (hour * 60) + minute;
};

export const minutesToTimeValue = (minutes = 0) => {
    const normalized = ((minutes % 1440) + 1440) % 1440;
    return timePartsToValue({
        hour: Math.floor(normalized / 60),
        minute: normalized % 60
    });
};

export const addMinutesToTime = (value = '', delta = 0, fallback = '09:00') => (
    minutesToTimeValue(timeValueToMinutes(value, fallback) + delta)
);

export const sortSlotValues = (times = []) => [...new Set(times.map(time => String(time || '').trim()).filter(Boolean))]
    .sort((a, b) => getSlotStartMinutes(a) - getSlotStartMinutes(b) || a.localeCompare(b));

export const inferSlotInterval = (times = []) => {
    const starts = sortSlotValues(times)
        .map(time => getSlotStartMinutes(time))
        .filter(minutes => Number.isFinite(minutes) && minutes < 9999);
    if (starts.length < 2) return 90;
    const gap = starts[1] - starts[0];
    return [15, 30, 45, 60, 75, 90, 120].includes(gap) ? gap : 90;
};
