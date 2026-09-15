import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, Info, Pencil } from 'lucide-react';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { PeriodCustomPicker } from '../../../shared/ui/PeriodCustomPicker';
import { PeriodSegmentedControl } from '../../../shared/ui/PeriodSegmentedControl';
import { SortField } from '../../../shared/ui/SortField';
import { formatDisplayDate, toDateKey } from '../../../utils/dates';
import {
  formatPeriodLabel,
  getPeriodRange,
  PERIOD_OPTIONS,
  shiftPeriod
} from '../../../utils/periodFilters';
import {
  countServiceSpotBookings,
  getServiceOpenSpots,
  getSpotSessionStatus
} from '../../../utils/services';
import { getServiceScheduleType } from '../../../utils/scheduleTypes';
import { getScheduleDayTimeline, getBusinessHoursForDate } from '../../../utils/staffAvailability';
import { DayTimelineMeter } from '../components/DayTimelineMeter';
import { ScheduleDatePicker } from '../components/ScheduleDatePicker';
import { SpotInfoSheet } from '../components/SpotInfoSheet';
import {
  bookingDateKey,
  compareAgendaBookings,
  compareSpotServices,
  formatBookingWindow,
  formatSessionPart,
  resolveStaffNames,
  serviceOverlapsRange,
  staffInitials,
  staffPhoto,
  statusLabel
} from './schedulePageUtils';

const SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'client', label: 'Client A-Z' },
  { id: 'service', label: 'Service A-Z' }
];

const SPOT_SORT_OPTIONS = [
  { id: 'latest', label: 'Latest' },
  { id: 'oldest', label: 'Oldest' },
  { id: 'service', label: 'Name A-Z' }
];

export function SchedulePage() {
  const {
    bookings,
    staff,
    services,
    confirmBooking,
    workspace
  } = useWorkspace();
  const [mode, setMode] = useState('slots');
  const [focusStaffId, setFocusStaffId] = useState('');
  const [day, setDay] = useState(() => toDateKey(new Date()));
  const [period, setPeriod] = useState('day');
  const [customRange, setCustomRange] = useState({ from: '', to: '' });
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [sortBy, setSortBy] = useState('latest');
  const [pickerOpen, setPickerOpen] = useState(false);
  const [infoSpotId, setInfoSpotId] = useState('');
  const [expandedDayKeys, setExpandedDayKeys] = useState(() => new Set([toDateKey(new Date())]));

  useEffect(() => {
    if (sortBy === 'client' || sortBy === 'service') {
      setExpandedDayKeys(new Set(['flat']));
      return;
    }
    setExpandedDayKeys(new Set([day]));
  }, [day, period, sortBy]);

  const periodRange = useMemo(
    () => getPeriodRange(day, period, customRange),
    [day, period, customRange]
  );
  const periodLabel = useMemo(
    () => formatPeriodLabel(day, period, customRange),
    [day, period, customRange]
  );

  const slotBookings = useMemo(
    () =>
      bookings.filter((booking) => {
        const service = services.find((row) => row.id === booking.serviceId);
        const type = getServiceScheduleType(service || booking);
        return type !== 'class_session';
      }),
    [bookings, services]
  );

  const agendaBookings = useMemo(() => {
    const { start, end } = periodRange;
    return slotBookings
      .filter((booking) => booking.status === 'confirmed')
      .filter((booking) => {
        const key = bookingDateKey(booking);
        return key && key >= start && key <= end;
      })
      .filter((booking) => (focusStaffId ? booking.staffId === focusStaffId : true))
      .sort((a, b) => compareAgendaBookings(a, b, sortBy));
  }, [slotBookings, periodRange, focusStaffId, sortBy]);

  const agendaGroups = useMemo(() => {
    const groupByDate = sortBy === 'oldest' || sortBy === 'latest';
    if (!groupByDate) {
      return [{ dateKey: '', items: agendaBookings }];
    }
    const groups = [];
    const map = new Map();
    for (const booking of agendaBookings) {
      const key = bookingDateKey(booking);
      if (!map.has(key)) {
        const group = { dateKey: key, items: [] };
        map.set(key, group);
        groups.push(group);
      }
      map.get(key).items.push(booking);
    }
    if (sortBy === 'latest') groups.reverse();
    return groups;
  }, [agendaBookings, sortBy]);

  const slotAgendaGroups = useMemo(() => {
    if (period === 'day') {
      return [{ dateKey: day, items: agendaBookings }];
    }
    return agendaGroups;
  }, [period, day, agendaBookings, agendaGroups]);

  const showAgendaMeters =
    period === 'day' ||
    period === 'custom' ||
    ((period === 'week' || period === 'month' || period === 'all') &&
      (sortBy === 'oldest' || sortBy === 'latest'));

  const allSpotServices = useMemo(
    () =>
      (services || [])
        .filter((service) => getServiceScheduleType(service) === 'class_session')
        .filter((service) => service.active !== false)
        .sort((a, b) =>
          String(a.sessionStartDate || '').localeCompare(String(b.sessionStartDate || ''))
        ),
    [services]
  );

  const spotServices = useMemo(() => {
    let list = allSpotServices.filter((service) =>
      serviceOverlapsRange(service, periodRange.start, periodRange.end)
    );
    if (focusStaffId) {
      list = list.filter((service) =>
        (Array.isArray(service.staffIds) ? service.staffIds : []).includes(focusStaffId)
      );
    }
    return [...list].sort((a, b) => compareSpotServices(a, b, sortBy === 'client' ? 'oldest' : sortBy));
  }, [allSpotServices, periodRange, focusStaffId, sortBy]);

  const spotStats = useMemo(() => {
    let openSeats = 0;
    let filledSeats = 0;
    let liveOrUpcoming = 0;
    for (const service of spotServices) {
      const status = getSpotSessionStatus(service);
      if (status === 'upcoming' || status === 'live') liveOrUpcoming += 1;
      const booked = countServiceSpotBookings(service, bookings);
      const capacity = Math.max(1, Number(service.capacity) || 1);
      filledSeats += Math.min(booked, capacity);
      openSeats += getServiceOpenSpots(service, bookings);
    }
    return {
      programmes: liveOrUpcoming,
      openSeats,
      filledSeats
    };
  }, [spotServices, bookings]);

  const infoSpot = allSpotServices.find((service) => service.id === infoSpotId) || null;

  const dayHours = useMemo(
    () => getBusinessHoursForDate(day, workspace.availabilityRules || {}),
    [day, workspace.availabilityRules]
  );

  const toggleAgendaDay = (key) => {
    const id = key || 'flat';
    setExpandedDayKeys((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const renderStaffFilter = () => (
    <div className="bb-schedule-staff-filter" role="tablist" aria-label="Staff filter">
      <button
        type="button"
        role="tab"
        aria-selected={!focusStaffId}
        className={`bb-schedule-staff-avatar${!focusStaffId ? ' is-active' : ''}`}
        onClick={() => setFocusStaffId('')}
      >
        <span className="bb-schedule-staff-avatar-face is-all" aria-hidden="true">
          All
        </span>
        <span className="bb-schedule-staff-avatar-name">All staff</span>
      </button>
      {staff.map((member) => {
        const photo = staffPhoto(member);
        const active = focusStaffId === member.id;
        return (
          <button
            key={member.id}
            type="button"
            role="tab"
            aria-selected={active}
            title={member.name}
            className={`bb-schedule-staff-avatar${active ? ' is-active' : ''}`}
            style={{ '--staff-color': member.color || '#101828' }}
            onClick={() => setFocusStaffId(member.id)}
          >
            <span className="bb-schedule-staff-avatar-face" aria-hidden="true">
              {photo ? <img src={photo} alt="" /> : staffInitials(member.name)}
            </span>
            <span className="bb-schedule-staff-avatar-name">{member.name}</span>
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="bb-schedule-desk">
      <header className="bb-schedule-desk-header">
        <div className="bb-schedule-desk-copy">
          <div className="bb-page-title-wrap">
            <div className="bb-page-header-glow" aria-hidden="true" />
            <h1 className="bb-page-title bb-schedule-desk-title">Schedule</h1>
          </div>
        </div>

        <div className="bb-schedule-desk-tools">
          <div className="bb-schedule-mode" role="tablist" aria-label="Schedule mode">
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'slots'}
              className={`bb-schedule-mode-btn${mode === 'slots' ? ' is-active' : ''}`}
              onClick={() => setMode('slots')}
            >
              Slots
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={mode === 'spots'}
              className={`bb-schedule-mode-btn${mode === 'spots' ? ' is-active' : ''}`}
              onClick={() => {
                setMode('spots');
                if (sortBy === 'client') setSortBy('oldest');
              }}
            >
              Spots
            </button>
          </div>
        </div>
      </header>

      <section className="bb-schedule-toolbar" aria-label="Schedule tools">
        <PeriodSegmentedControl
          variant="period"
          ariaLabel="Period"
          value={period}
          options={PERIOD_OPTIONS}
          onChange={setPeriod}
          onCustomSelect={() => setCustomPickerOpen(true)}
        />

        <div className="bb-schedule-toolbar-end">
          <div className="bb-schedule-day-nav">
            <button
              type="button"
              className="bb-ghost-btn px-3"
              onClick={() => setDay(shiftPeriod(day, period, -1))}
              aria-label="Previous period"
              disabled={period === 'all' || period === 'custom'}
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              className="bb-schedule-day-label"
              onClick={() => {
                if (period === 'custom') setCustomPickerOpen(true);
                else setPickerOpen(true);
              }}
              aria-label="Pick day or period"
              title="Pick day or period"
            >
              {periodLabel}
              <Pencil size={13} strokeWidth={2.2} aria-hidden="true" />
            </button>
            <button
              type="button"
              className="bb-ghost-btn px-3"
              onClick={() => setDay(shiftPeriod(day, period, 1))}
              aria-label="Next period"
              disabled={period === 'all' || period === 'custom'}
            >
              <ChevronRight size={18} />
            </button>
            <button
              type="button"
              className="bb-schedule-today-btn"
              onClick={() => {
                setDay(toDateKey(new Date()));
                setPeriod('day');
              }}
            >
              Today
            </button>
          </div>
        </div>
      </section>

      <div className="bb-schedule-stage" key={`${mode}-${period}-${day}`}>
        <div className="bb-schedule-stage-filters">
          {renderStaffFilter()}
          <SortField
            value={mode === 'spots' && sortBy === 'client' ? 'oldest' : sortBy}
            onChange={setSortBy}
            options={mode === 'slots' ? SORT_OPTIONS : SPOT_SORT_OPTIONS}
            pickerTitle="Sort schedule"
            pickerHint={
              mode === 'slots'
                ? 'Order appointments in this period.'
                : 'Order programmes in this period.'
            }
          />
        </div>

        {mode === 'slots' ? (
          period !== 'day' && agendaBookings.length === 0 ? (
            <div className="bb-schedule-empty">
              <p className="bb-schedule-empty-title">No confirmed bookings</p>
              <p className="bb-schedule-empty-copy">
                {focusStaffId
                  ? 'No confirmed appointments for this staff member in the selected period.'
                  : 'No confirmed appointments in this period. Pending requests stay in Requests until confirmed.'}
              </p>
            </div>
          ) : (
            <section className="bb-schedule-agenda" aria-label="Confirmed appointments">
              {slotAgendaGroups.map((group) => {
                const groupKey = group.dateKey || 'flat';
                const expanded = expandedDayKeys.has(groupKey);
                const meterDateKey = showAgendaMeters ? group.dateKey : '';
                const timeline = meterDateKey
                  ? getScheduleDayTimeline({
                      staffId: focusStaffId || '',
                      dateKey: meterDateKey,
                      staffAvailability: workspace.staffAvailability || {},
                      availabilityRules: workspace.availabilityRules || {},
                      bookings: agendaBookings
                    })
                  : null;
                const hasOpen = timeline?.segments?.some((segment) => segment.kind === 'open');
                const hasBreak = timeline?.segments?.some((segment) => segment.kind === 'break');
                const hasBooking = timeline?.segments?.some(
                  (segment) => segment.kind === 'booking'
                );
                const hoursLabel =
                  group.dateKey === day
                    ? dayHours.open
                      ? `${dayHours.openTime} – ${dayHours.closeTime}`
                      : 'Business closed'
                    : null;
                const countLabel =
                  group.items.length === 1
                    ? '1 booking'
                    : `${group.items.length} bookings`;

                return (
                  <div
                    key={groupKey}
                    className={`bb-schedule-agenda-group${expanded ? ' is-open' : ''}`}
                  >
                    <button
                      type="button"
                      className="bb-schedule-agenda-day-toggle"
                      aria-expanded={expanded}
                      onClick={() => toggleAgendaDay(groupKey)}
                    >
                      <span className="bb-schedule-agenda-day-toggle-copy">
                        <strong>
                          {group.dateKey
                            ? formatDisplayDate(group.dateKey)
                            : periodLabel || 'Appointments'}
                        </strong>
                        <span>
                          {countLabel}
                          {hoursLabel ? ` · ${hoursLabel}` : ''}
                          {focusStaffId
                            ? ` · ${staff.find((row) => row.id === focusStaffId)?.name || 'Staff'}`
                            : ''}
                        </span>
                      </span>
                      <ChevronDown
                        size={18}
                        strokeWidth={2.2}
                        className="bb-schedule-agenda-day-chevron"
                        aria-hidden="true"
                      />
                    </button>

                    {expanded ? (
                      <div className="bb-schedule-agenda-day-panel">
                        {timeline ? (
                          <div className="bb-schedule-agenda-meter">
                            <DayTimelineMeter
                              segments={timeline.segments}
                              status={timeline.status}
                              dayStart={timeline.dayStart}
                              dayEnd={timeline.dayEnd}
                            />
                            {hasOpen || hasBreak || hasBooking || timeline.status === 'off' || timeline.status === 'leave' ? (
                              <div className="bb-schedule-day-meter-legend" aria-hidden="true">
                                {hasOpen ? (
                                  <span className="bb-schedule-day-meter-legend-item is-open">
                                    <i /> Working
                                  </span>
                                ) : null}
                                {hasBreak ? (
                                  <span className="bb-schedule-day-meter-legend-item is-break">
                                    <i /> Break
                                  </span>
                                ) : null}
                                {timeline.status === 'off' ? (
                                  <span className="bb-schedule-day-meter-legend-item is-off">
                                    <i /> Off day
                                  </span>
                                ) : null}
                                {timeline.status === 'leave' ? (
                                  <span className="bb-schedule-day-meter-legend-item is-leave">
                                    <i /> Leave
                                  </span>
                                ) : null}
                                {hasBooking ? (
                                  <span className="bb-schedule-day-meter-legend-item is-booking">
                                    <i /> Booking
                                  </span>
                                ) : null}
                              </div>
                            ) : null}
                          </div>
                        ) : null}

                        {group.items.length === 0 ? (
                          <div className="bb-schedule-agenda-day-empty">
                            <p className="bb-schedule-empty-title">No confirmed bookings</p>
                            <p className="bb-schedule-empty-copy">
                              {focusStaffId
                                ? 'No confirmed appointments for this staff member today.'
                                : 'No confirmed appointments today. Pending requests stay in Requests until confirmed.'}
                            </p>
                          </div>
                        ) : (
                          <div className="bb-schedule-agenda-list">
                            {group.items.map((booking) => {
                              const member = staff.find((row) => row.id === booking.staffId);
                              return (
                                <article key={booking.id} className="bb-schedule-agenda-row">
                                  <div className="bb-schedule-agenda-time">
                                    <strong>{formatBookingWindow(booking)}</strong>
                                    {sortBy === 'client' || sortBy === 'service' ? (
                                      <span>{formatDisplayDate(bookingDateKey(booking))}</span>
                                    ) : null}
                                  </div>
                                  <div className="bb-schedule-agenda-main">
                                    <h4 className="bb-schedule-agenda-client">
                                      {booking.clientName || 'Client'}
                                    </h4>
                                    <p className="bb-schedule-agenda-service">
                                      {booking.serviceName || 'Service'}
                                    </p>
                                    <p className="bb-schedule-agenda-meta">
                                      {member?.name || booking.staffName || 'Unassigned'}
                                      {booking.clientEmail || booking.clientPhone
                                        ? ` · ${booking.clientEmail || booking.clientPhone}`
                                        : ''}
                                    </p>
                                  </div>
                                  <span className="bb-schedule-status-chip is-confirmed">
                                    Confirmed
                                  </span>
                                </article>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </section>
          )
        ) : (
          <>
            <div className="bb-schedule-spot-stats">
              <div className="bb-schedule-spot-stat">
                <span className="bb-schedule-spot-stat-label">Active programmes</span>
                <strong className="bb-schedule-spot-stat-value">{spotStats.programmes}</strong>
              </div>
              <div className="bb-schedule-spot-stat">
                <span className="bb-schedule-spot-stat-label">Open seats</span>
                <strong className="bb-schedule-spot-stat-value">{spotStats.openSeats}</strong>
              </div>
              <div className="bb-schedule-spot-stat">
                <span className="bb-schedule-spot-stat-label">Seats filled</span>
                <strong className="bb-schedule-spot-stat-value">{spotStats.filledSeats}</strong>
              </div>
            </div>

            {spotServices.length === 0 ? (
              <div className="bb-schedule-empty">
                <p className="bb-schedule-empty-title">
                  {allSpotServices.length === 0
                    ? 'No spot programmes yet'
                    : 'Nothing in this period'}
                </p>
                <p className="bb-schedule-empty-copy">
                  {allSpotServices.length === 0
                    ? 'Add a service with type “Book a Spot” to run classes and programmes with fixed dates and capacity.'
                    : focusStaffId
                      ? 'No programmes assigned to this staff member in the selected period.'
                      : 'No programmes overlap this date range. Pick another day, week, or month.'}
                </p>
              </div>
            ) : (
              <div className="bb-schedule-spot-grid">
                {spotServices.map((service) => {
                  const capacity = Math.max(1, Number(service.capacity) || 1);
                  const booked = countServiceSpotBookings(service, bookings);
                  const open = getServiceOpenSpots(service, bookings);
                  const fill = Math.min(100, Math.round((booked / capacity) * 100));
                  const status = getSpotSessionStatus(service);
                  const imageSrc = service.imageUrls?.[0] || '';
                  const staffNames = resolveStaffNames(service, staff);

                  return (
                    <article key={service.id} className="bb-schedule-spot-card">
                      <div className={`bb-schedule-spot-media${imageSrc ? '' : ' is-empty'}`}>
                        {imageSrc ? <img src={imageSrc} alt="" /> : null}
                        <span className={`bb-schedule-status-chip is-${status}`}>
                          {statusLabel(status)}
                        </span>
                      </div>

                      <div className="bb-schedule-spot-card-body">
                        <h3 className="bb-schedule-spot-name">{service.name}</h3>

                        <dl className="bb-schedule-spot-when-list">
                          <div>
                            <dt>Starts</dt>
                            <dd>
                              {formatSessionPart(
                                service.sessionStartDate,
                                service.sessionStartTime
                              )}
                            </dd>
                          </div>
                          <div>
                            <dt>Ends</dt>
                            <dd>
                              {formatSessionPart(service.sessionEndDate, service.sessionEndTime)}
                            </dd>
                          </div>
                        </dl>

                        <p className="bb-schedule-spot-staff">
                          {staffNames.length ? staffNames.join(', ') : 'No staff assigned'}
                        </p>

                        <div className="bb-schedule-spot-capacity">
                          <span>
                            {booked}/{capacity} booked · {open} open
                          </span>
                          <span>{fill}%</span>
                        </div>
                        <div className="bb-schedule-spot-bar" aria-hidden="true">
                          <span style={{ width: `${fill}%` }} />
                        </div>

                        <button
                          type="button"
                          className="bb-schedule-spot-info"
                          onClick={() => setInfoSpotId(service.id)}
                        >
                          <Info size={15} strokeWidth={2.2} />
                          <span>Info</span>
                        </button>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {infoSpot ? (
        <SpotInfoSheet
          service={infoSpot}
          staff={staff}
          bookings={bookings}
          onClose={() => setInfoSpotId('')}
          onConfirm={confirmBooking}
        />
      ) : null}

      {pickerOpen ? (
        <ScheduleDatePicker
          day={day}
          onClose={() => setPickerOpen(false)}
          onApply={({ day: nextDay }) => {
            setDay(nextDay);
            setPickerOpen(false);
          }}
        />
      ) : null}

      <PeriodCustomPicker
        open={customPickerOpen}
        from={customRange.from || day}
        to={customRange.to || customRange.from || day}
        onClose={() => setCustomPickerOpen(false)}
        onApply={({ from, to }) => {
          setCustomRange({ from, to });
          setDay(from);
          setPeriod('custom');
          setCustomPickerOpen(false);
        }}
      />
    </div>
  );
}


