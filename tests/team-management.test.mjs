import test from 'node:test';
import assert from 'node:assert/strict';
import { buildTeamOverview, filterTeamMembers, formatTeamMinutes, normalizeTeamMember, teamServiceChanges, validateTeamMember } from '../src/features/teams/teamManagement.js';

test('team profiles validate contacts and keep private details bounded', () => {
  assert.match(validateTeamMember({ name: ' ' }), /name/);
  assert.match(validateTeamMember({ name: 'Maya', email: 'broken' }), /email/);
  assert.match(validateTeamMember({ name: 'Maya', phone: 'phone me' }), /phone/);
  assert.match(validateTeamMember({ name: 'Maya', notes: 'a'.repeat(1001) }), /notes/);
  assert.equal(validateTeamMember({ name: 'Maya', phone: '+27 (21) 555-0100' }), '');
  assert.deepEqual(normalizeTeamMember({ name: ' Maya ', email: ' maya@example.com ', active: false }).name, 'Maya');
  assert.equal(normalizeTeamMember({ name: 'Maya' }).active, true);
});

test('service responsibility changes preserve the other staff and unrelated service details', () => {
  const services = [{ id: 'cut', name: 'Cut', price: 100, staffIds: ['owner', 'maya'] }, { id: 'colour', staffIds: ['owner'] }, { id: 'style', staffIds: ['maya'] }];
  const changes = teamServiceChanges(services, 'maya', ['colour', 'style']);
  assert.equal(changes.length, 2);
  assert.deepEqual(changes[0], { id: 'cut', name: 'Cut', price: 100, staffIds: ['owner'] });
  assert.deepEqual(changes[1].staffIds, ['owner', 'maya']);
  assert.deepEqual(services[0].staffIds, ['owner', 'maya']);
});

test('roster filters preserve inactive history and search job titles and contacts', () => {
  const members = [{ id: 'one', name: 'Zola', active: false, role: 'Instructor' }, { id: 'two', name: 'Maya', email: 'm@example.com' }, { id: 'three', name: 'Ali', role: 'Stylist' }];
  assert.deepEqual(filterTeamMembers(members).map(member => member.id), ['three', 'two']);
  assert.deepEqual(filterTeamMembers(members, 'instructor', 'all').map(member => member.id), ['one']);
  assert.deepEqual(filterTeamMembers(members, '', 'inactive').map(member => member.id), ['one']);
  assert.deepEqual(filterTeamMembers(members, 'm@example', 'all').map(member => member.id), ['two']);
});

test('workload uses business time, confirmed bookings and unique class sessions', () => {
  const staff = [{ id: 'maya', name: 'Maya' }, { id: 'former', name: 'Former', active: false }];
  const services = [{ id: 'class', scheduleType: 'class_session', staffIds: ['maya'] }];
  const bookings = [
    { id: 'seat1', serviceId: 'class', staffId: 'maya', status: 'confirmed', dateKey: '2026-10-09', time: '10:00', durationMinutes: 60 },
    { id: 'seat2', serviceId: 'class', staffId: 'maya', status: 'confirmed', dateKey: '2026-10-09', time: '10:00', durationMinutes: 60 },
    { id: 'pending', staffId: 'maya', status: 'pending', dateKey: '2026-10-09', time: '12:00', durationMinutes: 30 },
    { id: 'cancelled', staffId: 'maya', status: 'cancelled', dateKey: '2026-10-09', time: '12:00', durationMinutes: 30 },
    { id: 'unassigned', status: 'confirmed', dateKey: '2026-10-09', time: '13:00', durationMinutes: 30 },
    { id: 'old', staffId: 'former', status: 'confirmed', dateKey: '2026-10-09', time: '15:00', durationMinutes: 60 }
  ];
  const result = buildTeamOverview({ staff, services, bookings, workspace: { timezone: 'Africa/Johannesburg' }, now: Date.parse('2026-10-09T08:30:00Z') });
  assert.equal(result.clock.time, '10:30');
  assert.equal(result.counts.active, 1);
  assert.equal(result.counts.inactive, 1);
  assert.equal(result.counts.sessions, 3);
  assert.equal(result.counts.unassigned, 1);
  assert.equal(result.members[0].todayCount, 1);
  assert.equal(result.members[0].scheduledMinutes, 60);
  assert.equal(result.members[0].status, 'busy');
  assert.equal(result.members[1].status, 'inactive');
  assert.equal(result.members[1].historyCount, 1);
});

test('overlapping appointment durations count elapsed scheduled time once', () => {
  const result = buildTeamOverview({ staff: [{ id: 'one', name: 'One' }], bookings: [
    { id: 'a', staffId: 'one', status: 'confirmed', dateKey: '2026-10-09', time: '09:00', durationMinutes: 60 },
    { id: 'b', staffId: 'one', status: 'confirmed', dateKey: '2026-10-09', time: '09:30', durationMinutes: 60 }
  ], workspace: { timezone: 'Africa/Johannesburg' }, now: Date.parse('2026-10-09T05:00:00Z') });
  assert.equal(result.members[0].scheduledMinutes, 90);
  assert.equal(result.members[0].todayCount, 2);
  assert.equal(result.members[0].status, 'later');
  assert.equal(formatTeamMinutes(90), '1h 30m');
});
