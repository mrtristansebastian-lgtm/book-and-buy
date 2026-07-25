import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  CircleAlert,
  ExternalLink,
  Plus,
  Rocket,
  Send,
  TrendingUp,
  UserPlus
} from 'lucide-react';
import { getLocalDateStr } from '../../../utils/dates.js';
import { dateToMs, formatMoney, getBookingAmountInCents } from '../../finance/utils/financeMetrics.js';

const navigateTo = (tab, editorTab) => {
  if (typeof window === 'undefined') return;
  const publicTab = { business: 'schedule', communications: 'support', staff: 'team' }[tab] || tab;
  window.location.hash = editorTab ? `#/dashboard/${publicTab}/${editorTab}` : `#/dashboard/${publicTab}`;
};

const periodOptions = ['Today', 'Week', 'Month'];
const incompleteBusinessNames = new Set(['', 'your business', 'still needed', 'business name']);
const inactiveBookingStatuses = new Set(['declined', 'cancelled', 'canceled']);
const pendingRescheduleStatuses = new Set(['pending', 'requested', 'countered', 'offered']);

const asArray = (value) => Array.isArray(value) ? value : [];

const normalizeText = (value) => String(value || '').trim();

const isRealBusinessName = (value) => !incompleteBusinessNames.has(normalizeText(value).toLowerCase());

const formatNumber = (value) => new Intl.NumberFormat('en-ZA').format(Math.max(0, Number(value) || 0));

const toMinutes = (time = '') => {
  const match = String(time || '').match(/^(\d{1,2}):(\d{2})/);
  return match ? (Number(match[1]) * 60) + Number(match[2]) : 9999;
};

const formatAgendaDate = (dateKey = '') => {
  const parsed = new Date(`${dateKey}T00:00:00`);
  if (Number.isNaN(parsed.getTime())) return '';
  return parsed.toLocaleDateString('en-ZA', { month: 'short', day: 'numeric' });
};

const resolveBookingDateKey = (booking = {}, todayKey) => {
  if (booking.dateKey) return String(booking.dateKey);
  const rawDate = normalizeText(booking.date);
  if (!rawDate) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(rawDate)) return rawDate;
  if (/^today$/i.test(rawDate)) return todayKey;
  const parsed = new Date(rawDate);
  return Number.isNaN(parsed.getTime()) ? '' : getLocalDateStr(parsed);
};

const getPeriodRange = (period, today) => {
  const start = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const end = new Date(start);
  if (period === 'Week') end.setDate(start.getDate() + 6);
  else if (period === 'Month') end.setMonth(start.getMonth() + 1, 0);
  return {
    startKey: getLocalDateStr(start),
    endKey: getLocalDateStr(end)
  };
};

const isActiveBooking = (booking = {}) => {
  const status = normalizeText(booking.status).toLowerCase();
  return !inactiveBookingStatuses.has(status);
};

const getClientKey = (record = {}) => (
  normalizeText(record.clientEmail || record.email).toLowerCase() ||
  normalizeText(record.clientPhone || record.phone).toLowerCase() ||
  normalizeText(record.clientName || record.name).toLowerCase()
);

const getServiceName = (booking = {}) => (
  normalizeText(booking.serviceName) ||
  normalizeText(booking.serviceTitle) ||
  normalizeText(booking.service) ||
  'Booking'
);

const getClientName = (booking = {}) => normalizeText(booking.clientName) || 'Client';

const hasPendingReschedule = (booking = {}) => {
  const candidates = [
    booking.rescheduleStatus,
    booking.reschedule?.status,
    booking.latestReschedule?.status,
    booking.changeRequestStatus
  ].map(value => normalizeText(value).toLowerCase());
  return candidates.some(value => pendingRescheduleStatuses.has(value));
};

const isCreatedToday = (record = {}, todayKey) => {
  const createdMs = dateToMs(record.createdAtMs || record.createdAt || record.importedAt);
  if (!createdMs) return false;
  return getLocalDateStr(new Date(createdMs)) === todayKey;
};

const buildUniqueServiceList = (workspaceServices = [], settingsServices = []) => {
  const services = new Map();
  [...asArray(workspaceServices), ...asArray(settingsServices)].forEach((service, index) => {
    if (!service || service.deleted || service.archived || service.visible === false) return;
    services.set(service.id || service.name || `service-${index}`, service);
  });
  return Array.from(services.values());
};

const hasPersonalDetails = (personalProfile = {}) => Boolean(
  normalizeText(personalProfile.firstName) &&
  normalizeText(personalProfile.lastName) &&
  normalizeText(personalProfile.email) &&
  normalizeText(personalProfile.mobile || personalProfile.phone) &&
  normalizeText(personalProfile.country)
);

const formatServiceDuration = (service = {}) => {
  const value = normalizeText(service.duration || service.serviceDuration || service.minutes);
  if (!value) return 'Duration missing';
  if (/min|hour|hr/i.test(value)) return value;
  return `${value} min`;
};

const formatServicePrice = (service = {}) => (
  normalizeText(service.price || service.servicePrice || service.total || service.displayPrice) || 'Price not set'
);

const buildLaunchSteps = ({ settings = {}, personalProfile = {}, serviceList = [], bookings = [] }) => ([
  {
    label: 'Owner details ready',
    complete: hasPersonalDetails(personalProfile),
    action: 'Add personal details',
    tab: 'profile'
  },
  {
    label: 'Business identity added',
    complete: isRealBusinessName(settings.brandName) && Boolean(normalizeText(settings.businessEmail || settings.email || settings.phone)),
    action: 'Open profile',
    tab: 'profile'
  },
  {
    label: 'Service available to book',
    complete: serviceList.length > 0,
    action: 'Manage services',
    tab: 'services'
  },
  {
    label: 'Booking times configured',
    complete: asArray(settings.availableTimes).length > 0 || Object.keys(settings.schedule || {}).length > 0,
    action: 'Add working hours',
    tab: 'business'
  },
  {
    label: 'Booking page styled',
    complete: Boolean(settings.logo || settings.bannerImage || asArray(settings.venuePhotos).length),
    action: 'Choose page style',
    tab: 'editor',
    editorTab: 'style'
  },
  {
    label: 'Flow tested or published',
    complete: Boolean(settings.publishedAt || bookings.length),
    action: 'Preview page',
    tab: 'editor'
  }
]);

const buildSetupAssistantCards = ({ settings = {}, personalProfile = {}, serviceList = [], launchSteps = [] }) => {
  const firstServices = serviceList.slice(0, 3);
  const bookableTimes = asArray(settings.availableTimes);
  const cards = [
    {
      title: 'Personal details',
      done: hasPersonalDetails(personalProfile),
      detail: hasPersonalDetails(personalProfile) ? 'Owner contact ready' : 'Add owner contact details',
      tab: 'profile',
      items: [
        ['Name', [personalProfile.firstName, personalProfile.lastName].filter(Boolean).join(' ') || 'Not added'],
        ['Email', normalizeText(personalProfile.email) || 'Not added'],
        ['Phone', normalizeText(personalProfile.mobile || personalProfile.phone) || 'Not added'],
        ['Country', normalizeText(personalProfile.country) || 'Not added']
      ]
    },
    {
      title: 'Business identity',
      done: isRealBusinessName(settings.brandName),
      detail: isRealBusinessName(settings.brandName) ? settings.brandName : 'Business name still needed',
      tab: 'profile',
      items: [
        ['Business type', normalizeText(settings.serviceIndustry) || 'Not selected'],
        ['Business name', isRealBusinessName(settings.brandName) ? settings.brandName : 'Still needed'],
        ['Email', normalizeText(settings.businessEmail || settings.email) || 'Not added'],
        ['Phone', normalizeText(settings.businessPhone || settings.phone) || 'Not added']
      ]
    },
    {
      title: 'Services',
      done: serviceList.length > 0,
      detail: serviceList.length ? `${serviceList.length} visible service${serviceList.length === 1 ? '' : 's'} ready` : 'Add one visible service with duration',
      tab: 'services',
      items: firstServices.length
        ? firstServices.map(service => [
            normalizeText(service.name || service.title) || 'Service',
            `${formatServiceDuration(service)} / ${formatServicePrice(service)}`
          ])
        : [['Service', 'No service ready yet']]
    },
    {
      title: 'Hours',
      done: bookableTimes.length > 0 || Object.keys(settings.schedule || {}).length > 0,
      detail: `${bookableTimes.length} bookable time${bookableTimes.length === 1 ? '' : 's'} set`,
      tab: 'business',
      items: [
        ['Bookable times', bookableTimes.slice(0, 6).join(', ') || 'No slots yet'],
        ['Schedule scope', Object.keys(settings.schedule || {}).length ? 'Custom schedule days added' : 'Reusable default schedule']
      ]
    },
    {
      title: 'Booking behavior',
      done: true,
      detail: settings.availabilityRules?.holdMode === 'confirmed' ? 'Bookings reserve time immediately' : 'Requests can be reviewed first',
      tab: 'business',
      items: [
        ['Request mode', settings.availabilityRules?.holdMode === 'confirmed' ? 'Confirm automatically' : 'Review requests first'],
        ['Minimum notice', settings.availabilityRules?.bookingNotice || 'None'],
        ['Cancellation window', settings.availabilityRules?.cancellationWindow || 'None'],
        ['Waitlist', settings.features?.waitlist === false ? 'Off' : 'On']
      ]
    },
    {
      title: 'Recommended after publish',
      done: false,
      detail: 'Not required for launch',
      tab: 'editor',
      items: [
        ['Next setup', 'Payments'],
        ['Next setup', 'Notifications'],
        ['Next setup', 'Google Calendar'],
        ['Next setup', 'Team and migration']
      ]
    }
  ];
  return cards.map((card, index) => ({
    ...card,
    step: String(index + 1).padStart(2, '0'),
    active: !card.done && launchSteps.find(step => !step.complete)?.label?.toLowerCase().includes(card.title.split(' ')[0].toLowerCase())
  }));
};

const buildDashboardModel = ({
  bookings,
  clients,
  currency,
  period,
  today = new Date()
}) => {
  const todayKey = getLocalDateStr(today);
  const { startKey, endKey } = getPeriodRange(period, today);
  const normalizedBookings = asArray(bookings)
    .map(booking => ({ ...booking, dateKeyResolved: resolveBookingDateKey(booking, todayKey) }))
    .filter(isActiveBooking);
  const periodBookings = normalizedBookings.filter(booking => (
    booking.dateKeyResolved &&
    booking.dateKeyResolved >= startKey &&
    booking.dateKeyResolved <= endKey
  )).sort((a, b) => (
    String(a.dateKeyResolved || '9999-12-31').localeCompare(String(b.dateKeyResolved || '9999-12-31')) ||
    toMinutes(a.time) - toMinutes(b.time)
  ));
  const todayBookings = normalizedBookings
    .filter(booking => booking.dateKeyResolved === todayKey)
    .sort((a, b) => toMinutes(a.time) - toMinutes(b.time));
  const pendingReschedules = normalizedBookings.filter(hasPendingReschedule);
  const periodExpectedCents = periodBookings.reduce((sum, booking) => sum + getBookingAmountInCents(booking), 0);
  const clientLookup = new Map(asArray(clients).map(client => [getClientKey(client), client]));
  const returningTodayKeys = new Set();

  todayBookings.forEach(booking => {
    const key = getClientKey(booking);
    const profile = clientLookup.get(key);
    const hadPreviousBooking = normalizedBookings.some(other => (
      other !== booking &&
      getClientKey(other) === key &&
      other.dateKeyResolved &&
      other.dateKeyResolved < todayKey
    ));
    const profileSaysReturning = Number(profile?.bookingCount || 0) > 1 ||
      asArray(profile?.autoLabels).some(label => ['Returning', 'Regular'].includes(label)) ||
      asArray(profile?.labels).some(label => ['Returning', 'Regular', 'VIP'].includes(label));
    if (key && (hadPreviousBooking || profileSaysReturning)) returningTodayKeys.add(key);
  });

  return {
    todayKey,
    todayBookings,
    agendaBookings: period === 'Today' ? todayBookings : periodBookings,
    periodBookings,
    pendingReschedules: pendingReschedules.length,
    periodExpectedCents,
    clientStats: {
      newClients: asArray(clients).filter(client => isCreatedToday(client, todayKey)).length,
      returningToday: returningTodayKeys.size,
      reschedulesPending: pendingReschedules.length,
      total: asArray(clients).length
    }
  };
};

const EmptyState = ({ icon: Icon, title, copy, action, onClick }) => (
  <div className="dashboard-live-empty-state">
    <Icon size={18} />
    <strong>{title}</strong>
    <p>{copy}</p>
    {action && (
      <button type="button" onClick={onClick}>
        {action} <ArrowRight size={13} />
      </button>
    )}
  </div>
);

export const DashboardOverviewPage = ({
  greeting,
  name,
  settings = {},
  personalProfile = {},
  visibleBookings = [],
  clientDirectory = [],
  clientMetrics = {},
  workspaceServices = [],
  isGuestWorkspace = false,
  exampleMode = false,
  onExampleModeChange
}) => {
  const [period, setPeriod] = useState('Today');
  const [mode, setMode] = useState('live');
  const currency = settings.currency || 'ZAR';
  const serviceList = useMemo(
    () => buildUniqueServiceList(workspaceServices, settings.services),
    [workspaceServices, settings.services]
  );
  const launchSteps = useMemo(
    () => buildLaunchSteps({ settings, personalProfile, serviceList, bookings: visibleBookings }),
    [settings, personalProfile, serviceList, visibleBookings]
  );
  const setupAssistantCards = useMemo(
    () => buildSetupAssistantCards({ settings, personalProfile, serviceList, launchSteps }),
    [settings, personalProfile, serviceList, launchSteps]
  );
  const launchPercent = useMemo(() => {
    const completed = launchSteps.filter(step => step.complete).length;
    return Math.round((completed / Math.max(launchSteps.length, 1)) * 100);
  }, [launchSteps]);
  const nextLaunchStep = launchSteps.find(step => !step.complete) || launchSteps[launchSteps.length - 1];
  const dashboard = useMemo(
    () => buildDashboardModel({
      bookings: visibleBookings,
      clients: clientDirectory,
      currency,
      period
    }),
    [clientDirectory, currency, period, visibleBookings]
  );

  const isSetupMode = mode === 'setup';
  const clientSignals = [
    { label: 'New clients', value: dashboard.clientStats.newClients, tone: 'is-soft-green' },
    { label: 'Returning today', value: dashboard.clientStats.returningToday, tone: 'is-soft-blue' },
    { label: 'Reschedules pending', value: dashboard.clientStats.reschedulesPending, tone: 'is-soft-pink' },
    { label: 'Total', value: clientMetrics.total ?? dashboard.clientStats.total, tone: 'is-soft-neutral' }
  ];

  return (
    <div className="dashboard-overview-page flex-1 overflow-y-auto bg-white">
      <div className="dashboard-mission-shell">
        <header className={`dashboard-mission-header ${isSetupMode ? 'is-setup-mode' : 'is-live-mode'}`}>
          <div>
            <span className="dashboard-mission-eyebrow">Mission control</span>
            <h1>{greeting}, {name}</h1>
            <p>{isSetupMode ? 'Finish the essentials, then launch with a booking page that feels ready.' : 'A live view of real bookings, clients, payments, and decisions that need you.'}</p>
          </div>

          <div className="dashboard-mission-controls">
            <div className="dashboard-mode-toggle" aria-label="Dashboard mode">
              {[
                { id: 'setup', label: 'Setup' },
                { id: 'live', label: 'Live' }
              ].map(option => (
                <button
                  key={option.id}
                  type="button"
                  className={mode === option.id ? 'is-active' : ''}
                  onClick={() => setMode(option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {isGuestWorkspace && (
              <button type="button" role="switch" aria-checked={exampleMode} className={`dashboard-example-toggle ${exampleMode ? 'is-active' : ''}`} onClick={onExampleModeChange}>
                <span aria-hidden="true" /> Example data
              </button>
            )}
            {!isSetupMode && (
              <div className="dashboard-period-tabs" aria-label="Dashboard period">
                {periodOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    className={`dashboard-period-tab ${period === option ? 'is-active' : ''}`}
                    onClick={() => setPeriod(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}
          </div>
        </header>

        {exampleMode && (
          <div className="dashboard-example-readonly" role="status"><span>Read-only example</span> Explore a small set of realistic sample bookings without changing your workspace.</div>
        )}

        {isSetupMode ? (
          <main className="dashboard-launcher-assistant">
            <section className="dashboard-launcher-topbar">
              <div>
                <p><Rocket size={14} /> Setup assistant</p>
                <h2>Launch essentials</h2>
                <span>Same assistant logic as the launcher: finish the required setup, then polish payments, calendar, team, and automation after publish.</span>
              </div>
              <aside className="dashboard-launcher-score-card">
                <small>Launch Score</small>
                <strong>{launchPercent}%</strong>
                <em>{nextLaunchStep.complete ? 'Ready to keep testing and sharing.' : `Next: ${nextLaunchStep.label.toLowerCase()}.`}</em>
              </aside>
            </section>

            <section className="dashboard-launcher-progress" aria-label={`Launch score ${launchPercent}%`}>
              <span style={{ width: `${launchPercent}%` }} />
            </section>

            <section className="dashboard-launcher-summary" aria-label="Setup assistant review">
              {setupAssistantCards.map(card => (
                <button
                  type="button"
                  key={card.title}
                  className={`dashboard-launcher-card ${card.done ? 'is-ready' : 'is-next'}`}
                  onClick={() => navigateTo(card.tab)}
                >
                  <span className={`dashboard-launcher-status ${card.done ? 'is-done' : 'is-warning'}`}>
                    {card.done ? <CheckCircle2 size={18} strokeWidth={2.2} /> : <CircleAlert size={18} strokeWidth={2.2} />}
                  </span>
                  <div>
                    <p>{card.title}</p>
                    <strong>{card.detail}</strong>
                    <dl>
                      {card.items.map(([label, value], index) => (
                        <div key={`${card.title}-${label}-${index}`}>
                          <dt>{label}</dt>
                          <dd>{value}</dd>
                        </div>
                      ))}
                    </dl>
                  </div>
                  <ChevronRight size={16} />
                </button>
              ))}
            </section>

            <footer className="dashboard-launcher-footer">
              <button type="button" onClick={() => navigateTo('editor')}>I&apos;ll do this later</button>
              <button type="button" onClick={() => navigateTo(nextLaunchStep.tab, nextLaunchStep.editorTab)}>
                {nextLaunchStep.action} <ArrowRight size={15} />
              </button>
            </footer>
          </main>
        ) : (
          <main className="dashboard-live-pro">
            <section className="dashboard-live-workspace is-agenda-only">
              <article className="dashboard-live-agenda">
                <div className="dashboard-live-section-head">
                  <div>
                    <p>{period}</p>
                    <h2>Booking agenda</h2>
                  </div>
                  <button type="button" onClick={() => navigateTo('bookings')}>All bookings</button>
                </div>
                {dashboard.agendaBookings.length ? (
                  <div className="dashboard-live-timeline">
                    {dashboard.agendaBookings.slice(0, 6).map((booking, index) => (
                      <button key={booking.id || `${booking.time}-${getClientName(booking)}-${index}`} type="button" onClick={() => navigateTo('bookings')} className={index === 0 ? 'is-next' : ''}>
                        <time>{period === 'Today' ? (booking.time || 'Any time') : `${formatAgendaDate(booking.dateKeyResolved)} ${booking.time || ''}`}</time>
                        <span className="dashboard-live-time-dot" />
                        <div>
                          <strong>{getServiceName(booking)}</strong>
                          <small>{getClientName(booking)}</small>
                        </div>
                        <em>{normalizeText(booking.status) || 'Booking'}</em>
                      </button>
                    ))}
                  </div>
                ) : (
                  <EmptyState
                    icon={Calendar}
                    title={`No bookings ${period.toLowerCase()}`}
                    copy="This stays quiet until clients create real bookings or you add one manually."
                    action="Open bookings"
                    onClick={() => navigateTo('bookings')}
                  />
                )}
              </article>
            </section>

            <section className="dashboard-live-bottom-grid">
              <article className="dashboard-live-mini-panel">
                <div className="dashboard-live-section-head">
                  <div>
                    <p>Clients</p>
                    <h2>Client movement</h2>
                  </div>
                  <UserPlus size={17} />
                </div>
                <div className="dashboard-live-client-grid">
                  {clientSignals.map(signal => (
                    <button key={signal.label} type="button" onClick={() => navigateTo('clients')} className={signal.tone}>
                      <strong>{formatNumber(signal.value)}</strong>
                      <span>{signal.label}</span>
                    </button>
                  ))}
                </div>
              </article>

              <article className="dashboard-live-mini-panel">
                <div className="dashboard-live-section-head">
                  <div>
                    <p>Revenue</p>
                    <h2>Money {period.toLowerCase()}</h2>
                  </div>
                  <TrendingUp size={17} />
                </div>
                <div className="dashboard-live-money">
                  <div>
                    <span>Expected from real bookings</span>
                    <strong>{formatMoney(dashboard.periodExpectedCents, currency)}</strong>
                  </div>
                  <button type="button" onClick={() => navigateTo('finance')}>View finance <ArrowRight size={13} /></button>
                </div>
              </article>

              <article className="dashboard-live-mini-panel dashboard-live-quick-panel">
                <div className="dashboard-live-section-head">
                  <div>
                    <p>Quick create</p>
                    <h2>Move faster</h2>
                  </div>
                  <Plus size={17} />
                </div>
                <div className="dashboard-live-quick-actions">
                  <button type="button" onClick={() => navigateTo('bookings')}><Plus size={14} /> Booking</button>
                  <button type="button" onClick={() => navigateTo('business')}><Calendar size={14} /> Slot</button>
                  <button type="button" onClick={() => navigateTo('editor')}><ExternalLink size={14} /> Preview</button>
                  <button type="button" onClick={() => navigateTo('communications')}><Send size={14} /> Inbox</button>
                </div>
              </article>
            </section>
          </main>
        )}
      </div>
    </div>
  );
};
