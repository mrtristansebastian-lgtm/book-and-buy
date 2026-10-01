import { Globe2, Monitor, Smartphone, Tablet } from 'lucide-react';
import { formatLiveRelativeTime } from '../utils/analyticsMetrics';

const COUNTRY_FLAGS = import.meta.glob(
  '../../../../node_modules/flag-icons/flags/4x3/*.svg',
  { eager: true, query: '?url', import: 'default' }
);

function countryLabel(country = '') {
  const value = String(country || '').trim();
  if (!value) return 'Unknown country';
  if (!/^[a-z]{2}$/i.test(value)) return value;
  try {
    return new Intl.DisplayNames(['en'], { type: 'region' }).of(value.toUpperCase()) || value;
  } catch {
    return value.toUpperCase();
  }
}

export function CountryFlag({ country = '', label = 'Unknown country' }) {
  const code = String(country || '').trim().toLowerCase();
  const validCountry = /^[a-z]{2}$/.test(code);
  const flagUrl = validCountry
    ? COUNTRY_FLAGS[`../../../../node_modules/flag-icons/flags/4x3/${code}.svg`]
    : '';

  return (
    <span
      className={`bb-live-country-flag${flagUrl ? '' : ' is-empty'}`}
      role={flagUrl ? 'img' : undefined}
      aria-label={flagUrl ? `${label} flag` : undefined}
      aria-hidden={flagUrl ? undefined : 'true'}
    >
      {flagUrl ? <img src={flagUrl} alt="" aria-hidden="true" /> : null}
    </span>
  );
}

function deviceDetails(device = '') {
  if (device === 'mobile') return { label: 'Mobile', Icon: Smartphone };
  if (device === 'tablet') return { label: 'Tablet', Icon: Tablet };
  return { label: 'Desktop', Icon: Monitor };
}

export function AnalyticsLiveVisitors({
  sessions = [],
  total = sessions.length,
  now = Date.now()
}) {
  const visibleSessions = sessions.slice(0, 12);

  return (
    <section className="bb-live-column" aria-labelledby="bb-live-visitors-title">
      <header className="bb-live-column-head">
        <div>
          <p className="bb-live-column-kicker">Storefront</p>
          <h2 id="bb-live-visitors-title" className="bb-live-column-title">
            Active visitors
          </h2>
        </div>
        <span className="bb-live-column-count">
          {total} {total === 1 ? 'visitor' : 'visitors'}
        </span>
      </header>

      {total === 0 ? (
        <div className="bb-live-empty">
          <Globe2 size={18} aria-hidden="true" />
          <div>
            <p>No visitors on site right now</p>
            <span>New activity will appear here as it happens.</span>
          </div>
        </div>
      ) : (
        <div className="bb-live-visitor-list">
          {visibleSessions.map((session) => {
            const { label: deviceLabel, Icon: DeviceIcon } = deviceDetails(session.device);
            const visitorCountry = countryLabel(session.country);
            const relativeTime = formatLiveRelativeTime(session.lastSeenAt, now);
            return (
              <article key={session.id} className="bb-live-visitor-row">
                <CountryFlag country={session.country} label={visitorCountry} />
                <div className="bb-live-visitor-copy">
                  <strong className="bb-live-visitor-country">
                    {visitorCountry}
                  </strong>
                  <span className="bb-live-device">
                    <DeviceIcon size={13} aria-hidden="true" />
                    {deviceLabel}
                  </span>
                </div>
                <time
                  className="bb-live-row-time"
                  dateTime={new Date(session.lastSeenAt).toISOString()}
                >
                  {relativeTime}
                </time>
              </article>
            );
          })}
          {total > visibleSessions.length ? (
            <p className="bb-live-more-row">
              +{total - visibleSessions.length} more live{' '}
              {total - visibleSessions.length === 1 ? 'visitor' : 'visitors'}
            </p>
          ) : null}
        </div>
      )}
    </section>
  );
}
