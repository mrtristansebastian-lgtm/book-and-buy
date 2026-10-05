import test from 'node:test';
import assert from 'node:assert/strict';
import { buildScheduleAgenda } from '../src/features/schedule/utils/scheduleAgenda.js';

const now = Date.parse('2026-10-05T10:00:30Z');
const booking = (id, extra = {}) => ({ id, dateKey: '2026-10-05', time: '11:00', durationMinutes: 60, status: 'confirmed', serviceId: 's1', clientName: id, ...extra });
const build = extra => buildScheduleAgenda({ now, timezone: 'UTC', ...extra });
const ids = rows => rows.map(row => row.booking.id);

test('summary uses only still-to-come confirmed bookings and current calendar day, Monday week and month', () => {
  const data = build({ bookings: [booking('today'), booking('sunday', { dateKey: '2026-10-11' }),
    booking('nextweek', { dateKey: '2026-10-12' }), booking('lastday', { dateKey: '2026-10-31' }),
    booking('nextmonth', { dateKey: '2026-11-01' }), booking('past-time', { time: '09:00' }),
    booking('pending', { status: 'pending' }), booking('waitlist', { status: 'waitlist' }),
    booking('cancelled', { status: 'cancelled' }), booking('completed', { status: 'completed' }), booking('declined', { status: 'declined' })] });
  assert.deepEqual(data.summary, { today: 1, week: 2, month: 4, inProgress: 0 });
  assert.equal(data.nextBooking.booking.id, 'today');
  assert.deepEqual(data.filterCounts, { active: 4, confirmed: 2, pending: 1, waitlist: 1, reschedule: 0 });
});

test('summary is independent of selected historical date and status filter but follows the staff filter', () => {
  const bookings = [booking('one', { staffId: 'one' }), booking('two', { staffId: 'two' }), booking('pending', { status: 'pending', staffId: 'one' })];
  const data = build({ bookings, staff: [{ id: 'one', name: 'One' }, { id: 'two', name: 'Two' }], staffId: 'one', anchorDay: '2026-09-01', period: 'month', filter: 'pending' });
  assert.equal(data.summary.today, 1);
  assert.equal(data.summary.month, 1);
  assert.equal(data.filteredCount, 0);
  assert.equal(data.nextBooking.booking.id, 'one');
});

test('business clock changes today and upcoming time at midnight independently of device timezone', () => {
  const data = build({ now: Date.parse('2026-10-05T22:30:00Z'), timezone: 'Africa/Johannesburg', bookings: [
    booking('newday', { dateKey: '2026-10-06', time: '01:00' }), booking('passed', { dateKey: '2026-10-05', time: '23:30' })
  ] });
  assert.equal(data.todayKey, '2026-10-06');
  assert.equal(data.currentTime, '00:30');
  assert.equal(data.summary.today, 1);
  assert.deepEqual(data.range, { start: '2026-10-06', end: '2026-10-06' });
  assert.equal(data.clock.timezone, 'Africa/Johannesburg');
});

test('seconds distinguish just-started, ongoing and finished appointments without rounded-minute inflation', () => {
  const data = build({ bookings: [booking('started', { time: '10:00' }), booking('future-minute', { time: '10:01' }), booking('ended', { time: '09:00' })] });
  assert.equal(data.rows.find(row => row.booking.id === 'started').phase, 'in-progress');
  assert.equal(data.rows.find(row => row.booking.id === 'ended').phase, 'past');
  assert.equal(data.rows.find(row => row.booking.id === 'future-minute').phase, 'upcoming');
  assert.equal(data.summary.today, 1);
  assert.equal(data.summary.inProgress, 1);
  const exact = build({ now: Date.parse('2026-10-05T10:00:00Z'), bookings: [booking('started', { time: '10:00' })] });
  assert.equal(exact.summary.today, 0);
  assert.equal(exact.summary.inProgress, 1);
});

test('overnight appointments stay in progress after midnight and preserve their start-day grouping', () => {
  const data = build({ now: Date.parse('2026-10-06T00:30:00Z'), anchorDay: '2026-10-05', bookings: [booking('overnight', { time: '23:30', durationMinutes: 120 })] });
  assert.equal(data.summary.inProgress, 1);
  assert.equal(data.groups[0].dateKey, '2026-10-05');
  assert.equal(data.groups[0].items[0].endDateKey, '2026-10-06');
  assert.equal(data.groups[0].items[0].endTime, '01:30');
  assert.equal(data.groups[0].items[0].phase, 'in-progress');
});

test('class session end snapshots and recorded service type take precedence over mutable catalog settings', () => {
  const data = build({ bookings: [booking('class', { scheduleType: 'class_session', durationMinutes: null, serviceDuration: '',
    dateKey: '2026-10-04', time: '23:00', sessionEndDate: '2026-10-05', sessionEndTime: '12:00', partySize: 5 }),
    booking('retired-service', { serviceId: 'missing', serviceScheduleType: 'class_session', partySize: 3 })],
    services: [{ id: 's1', scheduleType: 'appointment', duration: 15 }] });
  const row = data.rows.find(item => item.booking.id === 'class');
  assert.equal(row.kind, 'class_session');
  assert.equal(row.phase, 'in-progress');
  assert.equal(row.durationMinutes, 780);
  assert.equal(data.summary.inProgress, 1);
  assert.equal(data.summary.today, 1, 'A party of three still counts as one booking');
  assert.equal(data.rows.find(item => item.booking.id === 'retired-service').kind, 'class_session');
});

test('missing duration never borrows current catalog length or invents an ending', () => {
  const data = build({ bookings: [booking('started-unknown', { time: '10:00', durationMinutes: null, serviceDuration: '' }),
    booking('future-unknown', { durationMinutes: null, serviceDuration: '' })], services: [{ id: 's1', duration: 60 }] });
  const row = data.rows.find(item => item.booking.id === 'started-unknown');
  assert.equal(row.phase, 'unknown');
  assert.equal(row.endValid, false);
  assert.equal(row.endTime, '');
  assert.equal(row.durationMinutes, null);
  assert.deepEqual(ids(data.needsAttention), []);
  assert.deepEqual(ids(data.groups[0].items), ['started-unknown', 'future-unknown']);
  assert.equal(row.attentionReason, 'End time not recorded');
  assert.equal(data.summary.today, 1);
  assert.equal(data.summary.inProgress, 0);
});

test('invalid dates are visible globally, invalid times only within the selected date range', () => {
  const data = build({ bookings: [booking('invalid-date', { dateKey: '2026-02-30' }), booking('missing-date', { dateKey: '' }),
    booking('badtime', { time: '25:00' }), booking('other-day-badtime', { dateKey: '2026-10-06', time: '' }), booking('good')] });
  assert.deepEqual(new Set(ids(data.needsAttention)), new Set(['invalid-date', 'missing-date', 'badtime']));
  assert.equal(data.summary.today, 1);
  assert.equal(data.groups.length, 1);
  assert.deepEqual(ids(data.groups[0].items), ['good']);
  assert.equal(data.filteredCount, 4);
});

test('staff filtering retains unassigned and retired bookings without leaking them into another calendar', () => {
  const bookings = [booking('one', { staffId: 'one', staffName: 'Saved One' }), booking('unassigned'), booking('former', { staffId: 'old', staffName: 'Saved Former' })];
  const staff = [{ id: 'one', name: 'Current One' }];
  const all = build({ bookings, staff });
  assert.equal(all.summary.today, 3);
  assert.equal(all.rows.find(row => row.booking.id === 'one').staffName, 'Saved One');
  assert.equal(all.rows.find(row => row.booking.id === 'former').staff.name, 'Saved Former');
  assert.deepEqual(all.staffFilterOptions.map(item => item.id), ['', 'one', '__unassigned__', '__former__']);
  assert.deepEqual(ids(build({ bookings, staff, staffId: '__unassigned__' }).rows), ['unassigned']);
  assert.deepEqual(ids(build({ bookings, staff, staffId: '__former__' }).rows), ['former']);
  assert.deepEqual(ids(build({ bookings, staff, staffId: 'old' }).rows), ['former']);
  assert.equal(build({ bookings, staff, staffId: 'one' }).summary.today, 1);
});

test('deduplication uses the newest revision then latest update so cancellation or reschedule replaces old copies', () => {
  const data = build({ bookings: [booking('a', { revision: 1, updatedAt: 200 }), booking('a', { revision: 2, status: 'cancelled', updatedAt: 100 }),
    booking('b', { revision: 3, dateKey: '2026-10-05', updatedAt: { seconds: 1 } }), booking('b', { revision: 3, dateKey: '2026-10-06', updatedAt: { seconds: 2 } })] });
  assert.equal(data.rows.length, 1);
  assert.equal(data.summary.today, 0);
  assert.equal(data.summary.week, 1);
  assert.equal(data.rows[0].dateKey, '2026-10-06');
});

test('canonical server updates and ISO timestamps replace stale copies at the same revision', () => {
  const data = build({ bookings: [booking('server', { updatedAt: 999999, serverUpdatedAt: { seconds: 1 } }),
    booking('server', { time: '12:00', updatedAt: 10, serverUpdatedAt: { toMillis: () => 2000 } }),
    booking('iso', { updatedAt: '2026-10-05T09:00:00Z' }), booking('iso', { time: '13:00', updatedAt: '2026-10-05T10:00:00Z' })] });
  assert.equal(data.rows.find(row => row.booking.id === 'server').time, '12:00');
  assert.equal(data.rows.find(row => row.booking.id === 'iso').time, '13:00');
  assert.equal(data.summary.today, 2);
});

test('pending reschedule filters include one active booking without changing its confirmed upcoming count', () => {
  const data = build({ bookings: [booking('a'), booking('b', { status: 'pending' }), booking('c', { status: 'cancelled' })], filter: 'reschedule', pendingIds: new Set(['a', 'b', 'c']) });
  assert.equal(data.filterCounts.reschedule, 2);
  assert.deepEqual(ids(data.groups[0].items), ['a', 'b']);
  assert.equal(data.summary.today, 1);
  assert.equal(data.nextBooking.booking.id, 'a');
});

test('range grouping uses Monday weeks, real leap-year month ends and normalized custom dates', () => {
  const week = build({ anchorDay: '2026-10-11', period: 'week' });
  assert.deepEqual(week.range, { start: '2026-10-05', end: '2026-10-11' });
  const month = build({ anchorDay: '2028-02-11', period: 'month' });
  assert.deepEqual(month.range, { start: '2028-02-01', end: '2028-02-29' });
  assert.deepEqual(build({ period: 'custom', customRange: { from: '2026-10-07', to: '2026-10-01' } }).range, { start: '2026-10-01', end: '2026-10-07' });
  assert.deepEqual(build({ anchorDay: 'invalid', period: 'day' }).range, { start: '2026-10-05', end: '2026-10-05' });
});

test('nonexistent DST times stay unknown while valid timezone times remain usable', () => {
  const data = build({ timezone: 'America/New_York', now: Date.parse('2026-03-08T05:00:00Z'), anchorDay: '2026-03-08', bookings: [
    booking('gap', { dateKey: '2026-03-08', time: '02:30' }), booking('valid', { dateKey: '2026-03-08', time: '03:30' })
  ] });
  assert.deepEqual(ids(data.needsAttention), ['gap']);
  assert.equal(data.rows.find(row => row.booking.id === 'gap').startValid, false);
  assert.equal(data.summary.today, 1);
  assert.equal(data.clock.timezone, 'America/New_York');
  assert.equal(build({ timezone: 'bad-zone' }).clock.timezone, 'UTC', 'Invalid historical zone falls back to backend default');
});

test('date groups sort chronologically with stable time, client and ID ordering', () => {
  const data = build({ period: 'week', bookings: [booking('later-day', { dateKey: '2026-10-06' }), booking('Zed', { time: '12:00' }),
    booking('Bob'), booking('Amy'), booking('early', { time: '08:00' })] });
  assert.deepEqual(data.groups.map(group => group.dateKey), ['2026-10-05', '2026-10-06']);
  assert.deepEqual(ids(data.groups[0].items), ['early', 'Amy', 'Bob', 'Zed']);
});

test('today agenda carries over an appointment still running from the previous night', () => {
  const data = build({ now: Date.parse('2026-10-06T00:30:00Z'), bookings: [
    booking('overnight', { dateKey: '2026-10-05', time: '23:30', durationMinutes: 120 }),
    booking('ended-midnight', { dateKey: '2026-10-05', time: '23:00', durationMinutes: 60 }),
    booking('tomorrow-morning', { dateKey: '2026-10-06', time: '09:00' })
  ] });
  assert.deepEqual(data.groups.map(group => group.dateKey), ['2026-10-05', '2026-10-06']);
  assert.equal(data.groups[0].carryover, true);
  assert.deepEqual(ids(data.groups[0].items), ['overnight']);
  assert.equal(data.groups[0].items[0].carryover, true);
  assert.equal(data.groups[0].items[0].phase, 'in-progress');
  assert.equal(data.filteredCount, 2);
  assert.equal(data.summary.today, 1, 'Still-to-come totals remain based on future starts');
  assert.equal(data.summary.inProgress, 1);
});

test('week and month agendas retain class sessions that started before the selected range', () => {
  const classBooking = booking('long-class', { scheduleType: 'class_session', dateKey: '2026-09-28', time: '09:00',
    durationMinutes: null, sessionEndDate: '2026-10-06', sessionEndTime: '17:00' });
  for (const period of ['week', 'month']) {
    const data = build({ period, bookings: [classBooking] });
    assert.equal(data.groups.length, 1, period);
    assert.equal(data.groups[0].dateKey, '2026-09-28', 'Original start date stays visible');
    assert.equal(data.groups[0].carryover, true);
    assert.equal(data.groups[0].items[0].phase, 'in-progress');
    assert.equal(data.filterCounts.confirmed, 1);
    assert.equal(data.summary.week, 0);
    assert.equal(data.summary.month, 0);
    assert.equal(data.summary.inProgress, 1);
  }
});

test('known duration is elapsed real time across a spring DST jump, with correct business end time', () => {
  const data = build({ timezone: 'America/New_York', now: Date.parse('2026-03-08T07:45:00Z'), anchorDay: '2026-03-08',
    bookings: [booking('across-jump', { dateKey: '2026-03-08', time: '01:30', durationMinutes: 120 })] });
  const row = data.rows[0];
  assert.equal(row.startAt, Date.parse('2026-03-08T06:30:00Z'));
  assert.equal(row.endAt, Date.parse('2026-03-08T08:30:00Z'));
  assert.equal(row.endTime, '04:30', 'Two real hours span three wall-clock hours at spring-forward');
  assert.equal(row.phase, 'in-progress');
  assert.equal(data.summary.inProgress, 1);
});

test('ambiguous fall-back starts keep an honest unknown phase instead of choosing an invented offset', () => {
  const data = build({ timezone: 'America/New_York', now: Date.parse('2026-11-01T05:45:00Z'), anchorDay: '2026-11-01',
    bookings: [booking('repeated-time', { dateKey: '2026-11-01', time: '01:30', durationMinutes: 60 })] });
  const row = data.rows[0];
  assert.equal(row.startValid, true, 'The wall time exists but occurs twice');
  assert.equal(row.startAmbiguous, true);
  assert.equal(row.startAt, null);
  assert.equal(row.endValid, false);
  assert.equal(row.phase, 'unknown');
  assert.match(row.attentionReason, /happens twice/);
  assert.equal(data.summary.today, 0);
  assert.equal(data.summary.inProgress, 0);
  assert.deepEqual(ids(data.groups[0].items), ['repeated-time'], 'The booking remains visible once');
  assert.equal(data.needsAttention.length, 0);
});

test('an unambiguous start before a fall-back transition uses elapsed time even when its end wall time repeats', () => {
  const data = build({ timezone: 'America/New_York', now: Date.parse('2026-11-01T06:00:00Z'), anchorDay: '2026-11-01',
    bookings: [booking('before-repeat', { dateKey: '2026-11-01', time: '00:30', durationMinutes: 120 })] });
  assert.equal(data.rows[0].endAt, Date.parse('2026-11-01T06:30:00Z'));
  assert.equal(data.rows[0].endTime, '01:30');
  assert.equal(data.rows[0].phase, 'in-progress');
});

test('a future ambiguous fall-back booking counts as upcoming when either possible instant is still ahead', () => {
  const data = build({ timezone: 'America/New_York', now: Date.parse('2026-11-01T04:00:00Z'), anchorDay: '2026-11-01',
    bookings: [booking('future-repeat', { dateKey: '2026-11-01', time: '01:30', durationMinutes: 60 })] });
  assert.equal(data.rows[0].startAmbiguous, true);
  assert.equal(data.rows[0].phase, 'upcoming');
  assert.equal(data.rows[0].startAt, null, 'A specific offset is still not invented');
  assert.equal(data.rows[0].endValid, false);
  assert.equal(data.summary.today, 1);
  assert.equal(data.nextBooking.booking.id, 'future-repeat');
});

test('ambiguous times have a definite phase only when both possible timelines agree', () => {
  const data = { timezone: 'America/New_York', anchorDay: '2026-11-01', bookings: [
    booking('repeat', { dateKey: '2026-11-01', time: '01:30', durationMinutes: 120 })
  ] };
  assert.equal(build({ ...data, now: Date.parse('2026-11-01T05:45:00Z') }).rows[0].phase, 'unknown');
  const ongoing = build({ ...data, now: Date.parse('2026-11-01T06:45:00Z') });
  assert.equal(ongoing.rows[0].phase, 'in-progress');
  assert.equal(ongoing.summary.inProgress, 1);
  assert.equal(ongoing.rows[0].endTime, '', 'No precise end time is claimed');
  assert.equal(build({ ...data, now: Date.parse('2026-11-01T09:00:00Z') }).rows[0].phase, 'past');
});

test('selected summary changes with the chosen day, week or month while staying independent of status filters', () => {
  const bookings = [booking('today'), booking('thisweek', { dateKey: '2026-10-07' }),
    booking('nextweek', { dateKey: '2026-10-13' }), booking('nextmonth', { dateKey: '2026-11-02' }),
    booking('pending-nextmonth', { dateKey: '2026-11-03', status: 'pending' }),
    booking('cancelled', { dateKey: '2026-11-04', status: 'cancelled' })];
  assert.equal(build({ bookings }).selectedSummary.upcoming, 1);
  assert.equal(build({ bookings, period: 'week' }).selectedSummary.upcoming, 2);
  assert.equal(build({ bookings, period: 'month' }).selectedSummary.upcoming, 3);
  const future = build({ bookings, anchorDay: '2026-11-05', period: 'month', filter: 'pending' });
  assert.deepEqual(future.selectedSummary, { upcoming: 1, inProgress: 0, confirmed: 1 });
  assert.equal(future.filteredCount, 1, 'The pending list remains a separate status filter');
  assert.equal(future.summary.month, 3, 'Existing actual-current-month summary is preserved');
});

test('selected past ranges show zero upcoming and retain their historically confirmed count', () => {
  const bookings = [booking('past-one', { dateKey: '2026-09-15' }), booking('past-two', { dateKey: '2026-09-16' }), booking('today')];
  const data = build({ bookings, anchorDay: '2026-09-15', period: 'week' });
  assert.deepEqual(data.selectedSummary, { upcoming: 0, inProgress: 0, confirmed: 2 });
  assert.equal(data.summary.today, 1);
});

test('selected custom range summary follows the chosen staff and excludes invalid or cancelled starts', () => {
  const bookings = [booking('one', { staffId: 'one', dateKey: '2026-10-08' }), booking('two', { staffId: 'two', dateKey: '2026-10-09' }),
    booking('invalid', { staffId: 'one', dateKey: '', time: '' }), booking('cancelled', { staffId: 'one', dateKey: '2026-10-08', status: 'cancelled' })];
  const data = build({ bookings, staff: [{ id: 'one', name: 'One' }, { id: 'two', name: 'Two' }], staffId: 'one', period: 'custom',
    customRange: { from: '2026-10-08', to: '2026-10-09' }, filter: 'waitlist' });
  assert.deepEqual(data.selectedSummary, { upcoming: 1, inProgress: 0, confirmed: 1 });
  assert.equal(data.filteredCount, 0);
});

test('selected summary includes future class overlap and ongoing carryover without claiming they start in the range', () => {
  const future = build({ now: Date.parse('2026-10-01T08:00:00Z'), anchorDay: '2026-10-05', period: 'week', bookings: [
    booking('future-long-class', { scheduleType: 'class_session', dateKey: '2026-10-04', time: '09:00',
      durationMinutes: null, sessionEndDate: '2026-10-08', sessionEndTime: '17:00' })
  ] });
  assert.equal(future.groups[0].carryover, true);
  assert.deepEqual(future.selectedSummary, { upcoming: 1, inProgress: 0, confirmed: 1 });
  const ongoing = build({ now: Date.parse('2026-10-06T00:30:00Z'), bookings: [booking('night', {
    dateKey: '2026-10-05', time: '23:30', durationMinutes: 120
  })] });
  assert.deepEqual(ongoing.selectedSummary, { upcoming: 0, inProgress: 1, confirmed: 1 });
});
