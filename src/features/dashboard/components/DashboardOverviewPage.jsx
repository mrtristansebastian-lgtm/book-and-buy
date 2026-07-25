import {
  Rocket
} from 'lucide-react';

const DashboardComingSoon = () => (
  <main className="dashboard-coming-soon-shell" aria-labelledby="dashboard-coming-soon-title">
    <section className="dashboard-coming-soon-card">
      <span className="dashboard-coming-soon-orbit" aria-hidden="true">
        <Rocket size={24} strokeWidth={2.1} />
      </span>
      <p>Live dashboard</p>
      <h2 id="dashboard-coming-soon-title">Dashboard coming soon.</h2>
      <strong>We&apos;re planning the best, most functional dashboard for your booking workflow.</strong>
      <small>Your core tools stay available from the side navigation while this command center gets its proper treatment.</small>
    </section>
  </main>
);

export const DashboardOverviewPage = ({
  greeting,
  name,
  isGuestWorkspace = false,
  exampleMode = false,
  onExampleModeChange
}) => {
  return (
    <div className="dashboard-overview-page flex-1 overflow-y-auto bg-white">
      <div className="dashboard-mission-shell">
        <header className="dashboard-mission-header is-live-mode">
          <div>
            <span className="dashboard-mission-eyebrow">Mission control</span>
            <h1>{greeting}, {name}</h1>
            <p>The live dashboard is being shaped into a calmer, smarter workspace for your business.</p>
          </div>

          <div className="dashboard-mission-controls">
            {isGuestWorkspace && (
              <button type="button" role="switch" aria-checked={exampleMode} className={`dashboard-example-toggle ${exampleMode ? 'is-active' : ''}`} onClick={() => onExampleModeChange?.()}>
                <span aria-hidden="true" /> Example data
              </button>
            )}
          </div>
        </header>

        {exampleMode && (
          <div className="dashboard-example-readonly" role="status"><span>Read-only example</span> Explore a small set of realistic sample bookings without changing your workspace.</div>
        )}

        <DashboardComingSoon />
      </div>
    </div>
  );
};
