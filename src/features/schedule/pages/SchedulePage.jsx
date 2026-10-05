import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Clock3, Info } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { PageBackButton } from '../../../shared/ui/PageBackButton';
import { AppSheet } from '../../../shared/ui/AppSheet';
import { DashboardStat } from '../../../shared/ui/DashboardStat';
import { FilterChip } from '../../../shared/ui/FilterChip';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { PeriodCustomPicker } from '../../../shared/ui/PeriodCustomPicker';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { navigate, workspacePagePath } from '../../../app/routing';
import { setSupportFocusThread } from '../../support/utils/supportFormat';
import { formatDisplayDate, parseDateKey } from '../../../utils/dates';
import { formatPeriodLabel, shiftPeriod } from '../../../utils/periodFilters';
import { getBookingAvailabilityConflict, isBusinessOpenOnDate, resolveCalendarDayStatus } from '../../../utils/staffAvailability';
import { AvailabilityMonthGrid } from '../components/AvailabilityMonthGrid';
import { ScheduleAgenda } from '../components/ScheduleAgenda';
import { ScheduleBookingRow } from '../components/ScheduleBookingRow';
import { ScheduleBookingDetails } from '../components/ScheduleBookingDetails';
import { useScheduleReschedules } from '../hooks/useScheduleReschedules';
import { buildScheduleAgenda } from '../utils/scheduleAgenda';
import '../styles/schedule-agenda.css';

const PERIODS = [{ id: 'day', label: 'Day' }, { id: 'week', label: 'Week' }, { id: 'month', label: 'Month' }, { id: 'custom', label: 'Custom' }];
const FILTERS = [{ id: 'confirmed', label: 'Confirmed' }, { id: 'pending', label: 'Pending' }, { id: 'waitlist', label: 'Waitlist' }, { id: 'reschedule', label: 'Reschedule requested' }, { id: 'active', label: 'All active' }];
const monthFor = key => {
  const date = parseDateKey(key) || new Date();
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

export function SchedulePage() {
  const { bookings = [], staff = [], services = [], workspace = {} } = useWorkspace();
  const reschedules = useScheduleReschedules();
  const [now, setNow] = useState(Date.now);
  // A blank anchor follows the business's current day until a date is chosen.
  const [anchorDay, setAnchorDay] = useState('');
  const [period, setPeriod] = useState('day');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [filter, setFilter] = useState('confirmed');
  const [staffId, setStaffId] = useState('');
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [customOpen, setCustomOpen] = useState(false);
  const [googleCalendarOpen, setGoogleCalendarOpen] = useState(false);
  const [selectedBookingId, setSelectedBookingId] = useState('');
  const dateTrigger = useRef(null);
  const calendarRail = useRef(null);
  const data = useMemo(() => buildScheduleAgenda({ bookings, staff, services, staffId, timezone: workspace.timezone, now, anchorDay, period, customRange, filter, pendingIds: reschedules.pendingIds }), [bookings, staff, services, staffId, workspace.timezone, now, anchorDay, period, customRange, filter, reschedules.pendingIds]);
  const day = anchorDay || data.todayKey;
  const [monthAnchor, setMonthAnchor] = useState(() => monthFor(data.todayKey));
  const availabilityRules = workspace.availabilityRules || {};
  const staffAvailability = workspace.staffAvailability || {};
  const periodLabel = formatPeriodLabel(day, period, customRange);
  const selectedRow = data.rows.find(row => row.booking.id === selectedBookingId);
  const attentionRows = data.needsAttention.filter(row => !row.startValid);
  const indicatorDays = useMemo(() => new Set(data.rows.filter(row => row.booking.status === 'confirmed' && row.dateValid).map(row => row.dateKey)), [data.rows]);
  const hasCurrentStaff = staff.some(member => member.id === staffId);
  const timeLabel = `${data.clock.timezone.split('/').pop().replace(/_/g, ' ')} time`;

  useEffect(() => {
    const interval = window.setInterval(() => setNow(Date.now()), 30_000);
    const refresh = () => setNow(Date.now());
    window.addEventListener('focus', refresh);
    return () => { window.clearInterval(interval); window.removeEventListener('focus', refresh); };
  }, []);
  useEffect(() => setMonthAnchor(monthFor(day)), [day]);
  useEffect(() => { if (selectedBookingId && !selectedRow) setSelectedBookingId(''); }, [selectedBookingId, Boolean(selectedRow)]);
  useEffect(() => {
    if (!calendarOpen) return undefined;
    const frame = requestAnimationFrame(() => {
      calendarRail.current?.querySelector('.bb-schedule-picker-day.is-selected')?.focus({ preventScroll: true });
      calendarRail.current?.scrollIntoView({ block: 'nearest' });
    });
    const closeOnEscape = event => {
      if (event.key !== 'Escape') return;
      setCalendarOpen(false);
      dateTrigger.current?.focus();
    };
    const closeOutside = event => {
      if (calendarRail.current?.contains(event.target) || dateTrigger.current?.contains(event.target)) return;
      setCalendarOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    document.addEventListener('pointerdown', closeOutside);
    return () => { cancelAnimationFrame(frame); document.removeEventListener('keydown', closeOnEscape); document.removeEventListener('pointerdown', closeOutside); };
  }, [calendarOpen]);

  const selectDay = key => {
    setAnchorDay(key);
    setPeriod('day');
    setCalendarOpen(false);
    dateTrigger.current?.focus();
  };
  const selectCurrentPeriod = value => {
    setAnchorDay(data.todayKey);
    setPeriod(value);
    setFilter('confirmed');
    setCalendarOpen(false);
  };
  const viewBooking = row => setSelectedBookingId(row.booking.id);
  const openCalendar = () => {
    if (window.innerWidth > 850) {
      calendarRail.current?.querySelector('.bb-schedule-picker-day.is-selected')?.focus();
      return;
    }
    setCalendarOpen(value => !value);
  };
  const conflictFor = row => {
    if (!row.startValid) return { code: 'missing-start', label: row.dateValid ? 'Booking time needs attention' : 'Booking date needs attention' };
    if (row.booking.status !== 'confirmed') return null;
    if (!isBusinessOpenOnDate(row.dateKey, availabilityRules)) return { code: 'business-closed', label: 'Business is closed' };
    // A fixed-date class can legitimately span multiple days or business windows.
    if (row.kind === 'class_session') return null;
    if (!row.endValid) return { code: 'missing-end', label: row.attentionReason || 'End time not recorded' };
    return getBookingAvailabilityConflict({ booking: { ...row.booking, durationMinutes: row.durationMinutes }, staffId: row.staff.former ? '' : row.assignedStaffId, dateKey: row.dateKey, staffAvailability, availabilityRules });
  };
  const manageBooking = booking => navigate(`${workspacePagePath('requests')}?booking=${encodeURIComponent(booking.id)}`);
  const openConversation = threadId => {
    setSupportFocusThread(threadId);
    navigate(workspacePagePath('communications'));
  };

  return <div className="bb-schedule-agenda-page">
    <div className="bb-page-chrome"><header className="bb-agenda-page-head">
      <div><div className="bb-page-title-wrap"><PageBackButton /><span className="bb-page-title-main"><div className="bb-page-header-glow" aria-hidden="true" /><h1 className="bb-page-title">Schedule</h1></span></div><p className="bb-agenda-page-lede">Your bookings, one clear day at a time.</p></div>
      <Button action="sync" icon={<img src="/review-logos/google-calendar.webp" alt="" />} variant="secondary" className="bb-agenda-google-button" onClick={() => setGoogleCalendarOpen(true)} aria-haspopup="dialog">Google Calendar</Button>
    </header></div>

    <section className="bb-agenda-summary" aria-label="Confirmed bookings still to come">
      {[{ id: 'day', key: 'today', label: 'Today' }, { id: 'week', key: 'week', label: 'This week' }, { id: 'month', key: 'month', label: 'This month' }].map(item => <DashboardStat key={item.key} as="button" appearance="operational" value={data.summary[item.key].toLocaleString()} label={item.label} note="Still to come" aria-pressed={period === item.id && day === data.todayKey && filter === 'confirmed'} className={`bb-agenda-summary-stat${period === item.id && day === data.todayKey && filter === 'confirmed' ? ' is-selected' : ''}`} onClick={() => selectCurrentPeriod(item.id)} />)}
      <p className="bb-agenda-summary-note">Confirmed bookings that haven’t started{staffId ? ' for the selected staff' : ''}.{data.summary.inProgress ? ` ${data.summary.inProgress} in progress now.` : ''}</p>
    </section>

    <div className="bb-agenda-workspace">
      <aside ref={calendarRail} className={`bb-agenda-rail${calendarOpen ? ' is-open' : ''}`} id="schedule-date-picker" aria-label="Calendar and staff">
        <div className="bb-agenda-calendar-mobile-head"><span>Choose a date</span><button type="button" onClick={() => { setCalendarOpen(false); dateTrigger.current?.focus(); }}>Done</button></div>
        <div className="bb-agenda-calendar"><AvailabilityMonthGrid monthAnchor={monthAnchor} selectedDay={day} todayKey={data.todayKey} onSelectDay={selectDay}
          onPreviousMonth={() => setMonthAnchor(value => new Date(value.getFullYear(), value.getMonth() - 1, 1))}
          onNextMonth={() => setMonthAnchor(value => new Date(value.getFullYear(), value.getMonth() + 1, 1))}
          resolveStatus={key => hasCurrentStaff ? resolveCalendarDayStatus(staffId, key, staffAvailability, availabilityRules) : isBusinessOpenOnDate(key, availabilityRules) ? 'open' : 'business-closed'} hasIndicator={key => indicatorDays.has(key)} />
          <div className="bb-agenda-calendar-key"><span><i className="is-booked" />Confirmed booking</span><span><i className="is-closed" />{hasCurrentStaff ? 'Unavailable' : 'Business closed'}</span></div>
        </div>
        <label className="bb-agenda-staff-select"><span>Staff</span><select value={staffId} onChange={event => setStaffId(event.target.value)}>{data.staffFilterOptions.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label>
        <p className="bb-agenda-rail-note" title={data.clock.timezone}>Times shown in <strong>{timeLabel}</strong>.</p>
      </aside>

      <section className="bb-agenda-main" aria-label="Schedule bookings">
        <div className="bb-agenda-controls">
          <PeriodSegmentedControl value={period} onChange={setPeriod} onCustomSelect={() => setCustomOpen(true)} options={PERIODS} variant="period" ariaLabel="Schedule period" />
          <div className="bb-agenda-date-navigation">
            <button type="button" className="bb-agenda-date-arrow" aria-label={`Previous ${period === 'custom' ? 'period' : period}`} disabled={period === 'custom'} onClick={() => setAnchorDay(shiftPeriod(day, period, -1))}><ChevronLeft size={17} /></button>
            <button type="button" ref={dateTrigger} className="bb-agenda-date-trigger" onClick={openCalendar} aria-controls="schedule-date-picker" aria-expanded={typeof window !== 'undefined' && window.innerWidth > 850 ? undefined : calendarOpen}><CalendarDays size={15} aria-hidden="true" /><span>{periodLabel}</span><ChevronDown size={14} aria-hidden="true" /></button>
            <button type="button" className="bb-agenda-date-arrow" aria-label={`Next ${period === 'custom' ? 'period' : period}`} disabled={period === 'custom'} onClick={() => setAnchorDay(shiftPeriod(day, period, 1))}><ChevronRight size={17} /></button>
            <button type="button" className="bb-agenda-today" onClick={() => selectCurrentPeriod('day')}>Today</button>
          </div>
        </div>
        <div className="bb-agenda-mobile-staff"><label htmlFor="schedule-mobile-staff">Staff</label><select id="schedule-mobile-staff" value={staffId} onChange={event => setStaffId(event.target.value)}>{data.staffFilterOptions.map(member => <option key={member.id} value={member.id}>{member.name}</option>)}</select></div>
        <div className="bb-agenda-filters" role="group" aria-label="Booking status">{FILTERS.map(item => <FilterChip key={item.id} selected={filter === item.id} count={data.filterCounts[item.id]} onClick={() => setFilter(item.id)}>{item.label}</FilterChip>)}</div>

        {reschedules.error || reschedules.incomplete ? <p className="bb-agenda-feed-notice" role="alert">{reschedules.error || 'Showing up to 200 reschedule requests. Open Communications to find other requests.'}</p> : null}
        {data.nextBooking ? <section className="bb-agenda-next" aria-label="Next confirmed booking"><span className="bb-agenda-next-icon"><Clock3 size={18} aria-hidden="true" /></span><div><span className="bb-agenda-eyebrow">Next booking</span><strong>{data.nextBooking.serviceName}</strong><p>{data.nextBooking.clientName} · {data.nextBooking.dateKey === data.todayKey ? 'Today' : formatDisplayDate(data.nextBooking.dateKey)} at {data.nextBooking.time}</p></div><Button action="view" variant="secondary" onClick={() => viewBooking(data.nextBooking)}>Details</Button></section> : null}
        {period === 'day' && !isBusinessOpenOnDate(day, availabilityRules) ? <p className="bb-agenda-closed-notice"><Info size={16} aria-hidden="true" />Your business is closed on this day. Any existing bookings are still shown below.</p> : null}
        {attentionRows.length ? <section className="bb-agenda-attention" aria-label="Booking times to check"><header><AlertTriangle size={17} aria-hidden="true" /><div><h2>Check booking times</h2><p>These bookings need a date or time before they can appear in the agenda.</p></div></header>{attentionRows.map(row => <div className="bb-agenda-attention-item" key={row.booking.id}>{row.dateValid ? <p className="bb-agenda-attention-date">{formatDisplayDate(row.dateKey)}</p> : null}<ScheduleBookingRow row={row} conflict={conflictFor(row)} hasReschedule={reschedules.pendingIds.has(row.booking.id)} onView={viewBooking} /></div>)}</section> : null}
        {data.groups.length || !attentionRows.length ? <ScheduleAgenda groups={data.groups} todayKey={data.todayKey} nextBooking={data.nextBooking} pendingIds={reschedules.pendingIds} conflictFor={conflictFor} availabilityRules={availabilityRules} filter={filter} onView={viewBooking} onClearFilter={() => setFilter('active')} resetKey={`${day}:${period}:${customRange.from}:${customRange.to}:${staffId}:${filter}`} /> : null}
        <p className="bb-agenda-timezone" title={data.clock.timezone}>{timeLabel} · {data.filteredCount} booking{data.filteredCount === 1 ? '' : 's'} in this view</p>
      </section>
    </div>

    <PeriodCustomPicker open={customOpen} from={customRange.from || data.range.start} to={customRange.to || data.range.end} onClose={() => setCustomOpen(false)} onApply={range => { setCustomRange(range); setAnchorDay(range.from); setPeriod('custom'); setCustomOpen(false); }} />
    {selectedRow ? <ScheduleBookingDetails booking={selectedRow.booking} service={selectedRow.service} staffMember={selectedRow.staff} timing={selectedRow} workspace={workspace} proposal={reschedules.proposalsByBooking.get(selectedRow.booking.id)} rescheduleLoading={reschedules.loading} rescheduleError={reschedules.error} conflict={conflictFor(selectedRow)} onClose={() => setSelectedBookingId('')} onViewRequests={manageBooking} onOpenConversation={openConversation} /> : null}
    {googleCalendarOpen ? <AppSheet title="Google Calendar" eyebrow="BOOKING SYNC" onClose={() => setGoogleCalendarOpen(false)} panelClassName="bb-schedule-google-sheet" footer={<Button action="close" variant="secondary" onClick={() => setGoogleCalendarOpen(false)}>Done</Button>}>
      <div className="bb-schedule-google-intro"><img src="/review-logos/google-calendar.webp" width="48" height="48" alt="Google Calendar" /><div><h3>Your bookings, together.</h3><p>Keep confirmed appointments in your Google Calendar without changing how you manage your schedule.</p></div></div>
      <ul className="bb-schedule-google-features"><li><Check size={18} /><span>Confirmed bookings appear as calendar events.</span></li><li><Check size={18} /><span>Accepted reschedules update the same event.</span></li><li><Check size={18} /><span>Cancelled bookings are removed from the calendar.</span></li></ul>
      <p className="bb-schedule-google-policy">Bookings stay managed in Book &amp; Buy. Business hours, shifts and breaks are not exported. Changes made in Google Calendar won’t change a booking.</p>
      <div className="bb-schedule-google-setup" role="status"><Info size={20} /><div><strong>Connection setup required</strong><p>Google Calendar sync is not enabled yet. The app’s secure Google connection must be configured before you can connect your account. No bookings have been synced.</p></div></div>
    </AppSheet> : null}
  </div>;
}
