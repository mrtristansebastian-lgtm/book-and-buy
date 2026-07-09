import { useMemo, useState } from 'react';
import {
  ArrowRight,
  Bell,
  Calendar,
  Check,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  CreditCard,
  ExternalLink,
  Link,
  MessageCircle,
  Plus,
  Rocket,
  Send,
  Sparkles,
  UserPlus,
  Users
} from 'lucide-react';

const navigateTo = (tab, editorTab) => {
  if (typeof window === 'undefined') return;
  window.location.hash = editorTab ? `#/dashboard/${tab}/${editorTab}` : `#/dashboard/${tab}`;
};

const periodOptions = ['Today', 'Week', 'Month'];

const launchSteps = [
  { label: 'Business name added', complete: true, action: 'Open profile', tab: 'profile' },
  { label: 'First service added', complete: true, action: 'Manage services', tab: 'services' },
  { label: 'Add your working hours', complete: false, action: 'Add working hours', tab: 'business' },
  { label: 'Choose booking page style', complete: false, action: 'Choose page style', tab: 'editor', editorTab: 'style' },
  { label: 'Test your booking flow', complete: false, action: 'Preview page', tab: 'editor' },
  { label: 'Publish your page', complete: false, action: 'Publish page', tab: 'editor' }
];

const commandDeck = [
  {
    icon: ClipboardCheck,
    title: 'Approve booking requests',
    detail: '2 clients are waiting for a decision.',
    action: 'Review requests',
    tab: 'bookings',
    tone: 'is-urgent'
  },
  {
    icon: Calendar,
    title: 'Add slots for next week',
    detail: 'Your page has no availability after Sunday.',
    action: 'Add slots',
    tab: 'business'
  },
  {
    icon: MessageCircle,
    title: 'Reply to client message',
    detail: 'Mia asked about moving tomorrow\'s booking.',
    action: 'Open inbox',
    tab: 'communications'
  },
  {
    icon: CreditCard,
    title: 'Review unpaid booking',
    detail: 'One confirmed booking still needs payment.',
    action: 'View finance',
    tab: 'finance'
  }
];

const todayBookings = [
  { time: '09:00', service: 'Haircut', client: 'Sarah M.', state: 'Confirmed' },
  { time: '11:30', service: 'Consultation', client: 'John K.', state: 'Pending payment' },
  { time: '14:00', service: 'Deep Clean', client: 'Mpho D.', state: 'Request' },
  { time: '16:00', service: 'Beard Trim', client: 'Liam S.', state: 'Waitlist' }
];

const setupLockedCards = [
  { title: 'Clients', copy: 'Your client list will start filling up once people book.', icon: Users },
  { title: 'Finance', copy: 'Payments and revenue will appear after bookings are confirmed.', icon: CreditCard },
  { title: 'Support Inbox', copy: 'Client questions and reschedules will land here.', icon: MessageCircle }
];

const statusItems = [
  { label: 'Bookings', value: '3', detail: 'today' },
  { label: 'Requests', value: '2', detail: 'pending' },
  { label: 'Messages', value: '1', detail: 'unread' },
  { label: 'Revenue', value: 'R850', detail: 'expected' }
];

export const DashboardOverviewPage = ({ greeting, name }) => {
  const [period, setPeriod] = useState('Today');
  const [mode, setMode] = useState('setup');
  const launchPercent = useMemo(() => {
    const completed = launchSteps.filter(step => step.complete).length;
    return Math.round((completed / launchSteps.length) * 100);
  }, []);

  const isSetupMode = mode === 'setup';

  return (
    <div className="dashboard-overview-page flex-1 overflow-y-auto bg-white">
      <div className="dashboard-mission-shell">
        <header className="dashboard-mission-header">
          <div>
            <span className="dashboard-mission-eyebrow">Mission control</span>
            <h1>{greeting}, {name}</h1>
            <p>{isSetupMode ? 'Finish the few pieces that make your booking system ready to share.' : 'Here is what needs attention today and where to handle it.'}</p>
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
          </div>
        </header>

        {isSetupMode ? (
          <main className="dashboard-launch-layout">
            <section className="dashboard-launch-card">
              <div className="dashboard-card-head">
                <span><Rocket size={17} /></span>
                <div>
                  <p>Launch path</p>
                  <h2>Your booking system is {launchPercent}% ready</h2>
                </div>
              </div>
              <div className="dashboard-launch-meter" aria-label={`Launch readiness ${launchPercent}%`}>
                <span style={{ width: `${launchPercent}%` }} />
              </div>
              <div className="dashboard-launch-steps">
                {launchSteps.map(step => (
                  <button
                    type="button"
                    key={step.label}
                    onClick={() => navigateTo(step.tab, step.editorTab)}
                    className={step.complete ? 'is-complete' : ''}
                  >
                    <span>{step.complete ? <Check size={13} /> : <Circle size={10} />}</span>
                    <strong>{step.label}</strong>
                    <small>{step.action}</small>
                    <ChevronRight size={15} />
                  </button>
                ))}
              </div>
            </section>

            <aside className="dashboard-setup-side">
              <section className="dashboard-action-card is-celebration">
                <Sparkles size={18} />
                <h3>Next best step</h3>
                <p>Add working hours so clients know when they can book.</p>
                <button type="button" onClick={() => navigateTo('business')}>
                  Add working hours <ArrowRight size={14} />
                </button>
              </section>
              <section className="dashboard-action-card">
                <ExternalLink size={18} />
                <h3>Test the client flow</h3>
                <p>Preview the page before sharing it with real clients.</p>
                <button type="button" onClick={() => navigateTo('editor')}>
                  Preview page <ArrowRight size={14} />
                </button>
              </section>
            </aside>

            <section className="dashboard-locked-grid">
              {setupLockedCards.map(card => {
                const Icon = card.icon;
                return (
                  <article key={card.title} className="dashboard-locked-card">
                    <Icon size={18} />
                    <strong>{card.title}</strong>
                    <p>{card.copy}</p>
                  </article>
                );
              })}
            </section>
          </main>
        ) : (
          <main className="dashboard-live-layout">
            <section className="dashboard-status-grid">
              {statusItems.map(item => (
                <article key={item.label} className="dashboard-status-card">
                  <span>{item.label}</span>
                  <strong>{item.value}</strong>
                  <small>{item.detail}</small>
                </article>
              ))}
            </section>

            <section className="dashboard-command-deck">
              <div className="dashboard-section-title">
                <span><Bell size={15} /></span>
                <div>
                  <p>Command deck</p>
                  <h2>What needs attention now</h2>
                </div>
              </div>
              <div className="dashboard-command-list">
                {commandDeck.map((item, index) => {
                  const Icon = item.icon;
                  return (
                    <article key={item.title} className={`dashboard-command-item ${item.tone || ''}`}>
                      <span className="dashboard-command-rank">{index + 1}</span>
                      <Icon size={17} />
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </div>
                      <button type="button" onClick={() => navigateTo(item.tab)}>{item.action}</button>
                    </article>
                  );
                })}
              </div>
            </section>

            <section className="dashboard-live-grid">
              <article className="dashboard-panel-card">
                <div className="dashboard-section-title">
                  <span><Clock size={15} /></span>
                  <div>
                    <p>Today</p>
                    <h2>Bookings timeline</h2>
                  </div>
                </div>
                <div className="dashboard-timeline-list">
                  {todayBookings.map(booking => (
                    <button key={`${booking.time}-${booking.client}`} type="button" onClick={() => navigateTo('bookings')}>
                      <time>{booking.time}</time>
                      <strong>{booking.service}</strong>
                      <span>{booking.client}</span>
                      <small>{booking.state}</small>
                    </button>
                  ))}
                </div>
              </article>

              <article className="dashboard-panel-card">
                <div className="dashboard-section-title">
                  <span><Calendar size={15} /></span>
                  <div>
                    <p>Schedule health</p>
                    <h2>Availability check</h2>
                  </div>
                </div>
                <div className="dashboard-health-list">
                  <p><strong>Today:</strong> Open, 4 available slots</p>
                  <p><strong>Next week:</strong> No slots added yet</p>
                  <p><strong>Calendar:</strong> Ready to sync</p>
                </div>
                <button type="button" className="dashboard-panel-action" onClick={() => navigateTo('business')}>
                  Open schedule <ArrowRight size={14} />
                </button>
              </article>

              <article className="dashboard-panel-card">
                <div className="dashboard-section-title">
                  <span><MessageCircle size={15} /></span>
                  <div>
                    <p>Inbox preview</p>
                    <h2>Client messages</h2>
                  </div>
                </div>
                <div className="dashboard-preview-row">
                  <strong>Mia R.</strong>
                  <span>Can I move this to Friday?</span>
                  <button type="button" onClick={() => navigateTo('communications')}>Reply</button>
                </div>
                <div className="dashboard-preview-row">
                  <strong>Daniel K.</strong>
                  <span>Do you offer home visits?</span>
                  <button type="button" onClick={() => navigateTo('communications')}>Reply</button>
                </div>
              </article>

              <article className="dashboard-panel-card">
                <div className="dashboard-section-title">
                  <span><CreditCard size={15} /></span>
                  <div>
                    <p>Finance</p>
                    <h2>Revenue snapshot</h2>
                  </div>
                </div>
                <div className="dashboard-money-grid">
                  <span>Today expected <strong>R850</strong></span>
                  <span>Week confirmed <strong>R4,300</strong></span>
                  <span>Unpaid <strong>R300</strong></span>
                  <span>Deposits <strong>R600</strong></span>
                </div>
                <button type="button" className="dashboard-panel-action" onClick={() => navigateTo('finance')}>
                  View finance <ArrowRight size={14} />
                </button>
              </article>

              <article className="dashboard-panel-card">
                <div className="dashboard-section-title">
                  <span><UserPlus size={15} /></span>
                  <div>
                    <p>Client activity</p>
                    <h2>CRM signals</h2>
                  </div>
                </div>
                <div className="dashboard-health-list">
                  <p>2 new clients this week</p>
                  <p>1 returning client today</p>
                  <p>3 clients have not booked again in 60 days</p>
                </div>
                <button type="button" className="dashboard-panel-action" onClick={() => navigateTo('clients')}>
                  Open clients <ArrowRight size={14} />
                </button>
              </article>

              <article className="dashboard-panel-card dashboard-share-card">
                <div className="dashboard-section-title">
                  <span><Link size={15} /></span>
                  <div>
                    <p>Quick actions</p>
                    <h2>Move faster</h2>
                  </div>
                </div>
                <div className="dashboard-quick-grid">
                  <button type="button" onClick={() => navigateTo('bookings')}><Plus size={14} /> Manual booking</button>
                  <button type="button" onClick={() => navigateTo('business')}><Calendar size={14} /> Add slot</button>
                  <button type="button" onClick={() => navigateTo('editor')}><ExternalLink size={14} /> Preview page</button>
                  <button type="button" onClick={() => navigateTo('communications')}><Send size={14} /> Open inbox</button>
                </div>
              </article>
            </section>
          </main>
        )}
      </div>
    </div>
  );
};
