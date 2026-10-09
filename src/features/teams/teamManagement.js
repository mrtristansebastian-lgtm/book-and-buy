import { buildScheduleAgenda } from '../schedule/utils/scheduleAgenda.js';
import { getStaffDayWindows, resolveCalendarDayStatus, timeToMinutes } from '../../utils/staffAvailability.js';

const text = value => String(value ?? '').trim();

export function teamInitials(name = '') {
  const parts = text(name).split(/\s+/).filter(Boolean);
  return parts.length > 1 ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase() : (parts[0] || '?').slice(0, 2).toUpperCase();
}

export function isTeamMemberActive(member = {}) {
  return member.active !== false;
}

export function validateTeamMember(draft = {}) {
  const name = text(draft.name);
  if (!name) return 'Enter this person’s name.';
  if (name.length > 120) return 'Keep the name under 120 characters.';
  const email = text(draft.email);
  if (email.length > 254 || email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return 'Enter a valid email address, or leave it empty.';
  if (text(draft.phone).length > 40 || text(draft.phone) && !/^[+\d\s().\-/ext#]+$/i.test(text(draft.phone))) return 'Enter a valid phone number, or leave it empty.';
  if (text(draft.role).length > 120) return 'Keep the job title under 120 characters.';
  if (text(draft.notes).length > 1000) return 'Keep team notes under 1,000 characters.';
  return '';
}

export function normalizeTeamMember(draft = {}) {
  return { ...draft, name: text(draft.name), email: text(draft.email), phone: text(draft.phone), role: text(draft.role), notes: text(draft.notes), active: isTeamMemberActive(draft) };
}

/** Service assignment uses the existing service roster; it does not create account permissions. */
export function teamServiceChanges(services = [], staffId = '', selectedIds = []) {
  if (!staffId) return [];
  const selected = new Set(selectedIds);
  return services.flatMap(service => {
    const ids = Array.isArray(service.staffIds) ? service.staffIds : [];
    const assigned = ids.includes(staffId);
    if (assigned === selected.has(service.id)) return [];
    return [{ ...service, staffIds: selected.has(service.id) ? [...new Set([...ids, staffId])] : ids.filter(id => id !== staffId) }];
  });
}

export function filterTeamMembers(members = [], query = '', filter = 'active') {
  const needle = text(query).toLowerCase();
  return members.filter(member => {
    if (filter === 'active' && !isTeamMemberActive(member) || filter === 'inactive' && isTeamMemberActive(member)) return false;
    return !needle || [member.name, member.role, member.email, member.phone].some(value => text(value).toLowerCase().includes(needle));
  }).sort((left, right) => text(left.name).localeCompare(text(right.name), undefined, { sensitivity: 'base' }));
}

function sessionKey(row) {
  return row.kind === 'class_session' ? `${row.assignedStaffId}:${row.booking.serviceId}:${row.booking.sessionId || ''}:${row.dateKey}:${row.time}` : row.booking.id;
}

function uniqueSessions(rows) {
  return [...new Map(rows.map(row => [sessionKey(row), row])).values()];
}

/** Merge overlapping bookings so simultaneous class seats never inflate scheduled hours. */
function scheduledMinutes(rows, dayKey) {
  const start = Date.parse(`${dayKey}T00:00:00Z`);
  const end = start + 86400000;
  const ranges = rows.filter(row => row.startWall !== null && row.endWall !== null)
    .map(row => [Math.max(start, row.startWall), Math.min(end, row.endWall)])
    .filter(([from, to]) => to > from).sort((a, b) => a[0] - b[0]);
  let total = 0;
  let current = null;
  ranges.forEach(range => {
    if (!current) current = [...range];
    else if (range[0] <= current[1]) current[1] = Math.max(current[1], range[1]);
    else { total += current[1] - current[0]; current = [...range]; }
  });
  if (current) total += current[1] - current[0];
  return Math.round(total / 60000);
}

export function buildTeamOverview({ staff = [], services = [], bookings = [], workspace = {}, now = Date.now() } = {}) {
  const agenda = buildScheduleAgenda({ staff, services, bookings, timezone: workspace.timezone || 'Africa/Johannesburg', now, filter: 'confirmed' });
  const minute = timeToMinutes(agenda.clock.time);
  const confirmed = agenda.rows.filter(row => row.booking.status === 'confirmed');
  const todayRows = confirmed.filter(row => row.dateValid && (row.dateKey === agenda.todayKey || row.dateKey < agenda.todayKey && row.endDateKey >= agenda.todayKey));
  const members = staff.map(member => {
    const today = todayRows.filter(row => row.assignedStaffId === member.id);
    const next = confirmed.find(row => row.assignedStaffId === member.id && row.phase === 'upcoming') || null;
    const windows = getStaffDayWindows(member.id, agenda.todayKey, workspace.staffAvailability || {}, workspace.availabilityRules || {});
    const dayStatus = resolveCalendarDayStatus(member.id, agenda.todayKey, workspace.staffAvailability || {}, workspace.availabilityRules || {});
    const inProgress = today.some(row => row.phase === 'in-progress');
    const onShift = windows.some(window => {
      const from = timeToMinutes(window.start);
      const to = timeToMinutes(window.end);
      return from !== null && to !== null && minute >= from && minute < (to <= from ? to + 1440 : to);
    });
    const hasLaterShift = windows.some(window => (timeToMinutes(window.start) ?? -1) > minute);
    const status = !isTeamMemberActive(member) ? 'inactive' : dayStatus === 'leave' ? 'leave' : inProgress ? 'busy' : onShift ? 'on-shift' : hasLaterShift ? 'later' : dayStatus === 'break' ? 'break' : 'off';
    return {
      member, status, windows, next,
      today: uniqueSessions(today),
      todayCount: uniqueSessions(today).length,
      scheduledMinutes: scheduledMinutes(today, agenda.todayKey),
      upcomingCount: uniqueSessions(confirmed.filter(row => row.assignedStaffId === member.id && row.phase === 'upcoming')).length,
      services: services.filter(service => (service.staffIds || []).includes(member.id)),
      historyCount: bookings.filter(booking => booking.staffId === member.id).length
    };
  });
  return {
    todayKey: agenda.todayKey, clock: agenda.clock, members,
    counts: {
      all: staff.length,
      active: staff.filter(isTeamMemberActive).length,
      inactive: staff.filter(member => !isTeamMemberActive(member)).length,
      onShift: members.filter(row => isTeamMemberActive(row.member) && ['on-shift', 'busy'].includes(row.status)).length,
      sessions: uniqueSessions(todayRows).length,
      unassigned: uniqueSessions(todayRows.filter(row => !row.assignedStaffId || !staff.some(member => member.id === row.assignedStaffId))).length
    }
  };
}

export function formatTeamMinutes(minutes) {
  if (!minutes) return '0h';
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return hours ? `${hours}h${rest ? ` ${rest}m` : ''}` : `${rest}m`;
}

export const TEAM_STATUS_LABELS = Object.freeze({ inactive: 'Inactive', leave: 'On leave', busy: 'In a booking', 'on-shift': 'On shift', later: 'Starts later', break: 'On break', off: 'Off shift' });
