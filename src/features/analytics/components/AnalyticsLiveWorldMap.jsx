import { lazy, Suspense, useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Globe2, Map } from 'lucide-react';
import { Button } from '../../../shared/ui/Button';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import worldMap from '../assets/worldEqualEarth.json';
import { LiveCountryDetail } from './LiveCountryDetail';
import { LiveMapCountryPicker } from './LiveMapCountryPicker';
import { resolveLiveMapMarkets, getLiveMapCountry } from '../utils/liveMapMarkets';
import { buildLiveTrafficRows } from '../utils/liveTrafficRows';

const AnalyticsLiveGlobe = lazy(() => import('./AnalyticsLiveGlobe').then(module => ({ default: module.AnalyticsLiveGlobe })));

export function AnalyticsLiveWorldMap({
  sessions = [], total = 0, totalLabel = String(total || 0),
  loading = false, error = '', usingDemo = false, variant = 'live',
  capped = false, onOpenLiveStats
}) {
  const { workspace } = useWorkspace();
  const markets = useMemo(() => resolveLiveMapMarkets(workspace.website || {}), [workspace.website]);
  const policyKey = [markets.defaultCountry, markets.defaultView, markets.worldwide, ...markets.countries].join('|');
  const [view, setView] = useState(markets.defaultView);
  const [countryCode, setCountryCode] = useState(markets.defaultCountry);
  useEffect(() => {
    setView(markets.defaultView);
    setCountryCode(markets.defaultCountry);
  }, [policyKey]);
  const country = getLiveMapCountry(countryCode, worldMap.countries) || getLiveMapCountry(markets.defaultCountry, worldMap.countries);
  const selectedTotal = useMemo(() => buildLiveTrafficRows(sessions, { country }).total, [country, sessions]);
  const displayedTotal = view === 'country' ? selectedTotal : total;
  const displayedLabel = view === 'country' ? String(displayedTotal) : totalLabel;
  const selectCountry = code => {
    const destination = getLiveMapCountry(code, worldMap.countries);
    if (!destination) return;
    setCountryCode(destination.iso2); setView('country');
  };
  const marketName = markets.worldwide ? 'Worldwide market' : markets.countries.length === 1 ? 'Your selling market' : markets.countries.length ? `${markets.countries.length} selling markets` : 'Live locations';

  return <section className={`bb-live-world-map bb-market-map is-${variant}`} aria-label="Live visitor markets map">
    <header className="bb-live-world-head">
      <div className="bb-live-world-heading">
        <p className="bb-live-world-eyebrow">{marketName}</p>
        <h2>{view === 'country' ? country.name : 'Your visitors around the world'}</h2>
      </div>
      <div className="bb-live-world-toolbar">
        <div className="bb-live-world-meta">
          <span className="bb-live-world-count"><span className="bb-live-world-count-dot" aria-hidden="true" /><strong>{displayedLabel}</strong><span>{displayedTotal === 1 ? 'visitor' : 'visitors'}</span></span>
          <span className="bb-live-world-window">Past 5 min</span>
          {usingDemo ? <span className="bb-live-world-demo">Demo</span> : null}
        </div>
        {variant === 'home' && onOpenLiveStats ? <Button action="open" variant="secondary" type="button" className="bb-live-world-open bb-home-utility-action" aria-label="Open Live Stats" onClick={onOpenLiveStats}>Live stats<ArrowUpRight size={15} aria-hidden="true" /></Button> : null}
      </div>
    </header>
    <div className="bb-market-map-toolbar">
      <div className="bb-market-map-view" role="group" aria-label="Map view">
        <button type="button" aria-pressed={view === 'country'} onClick={() => setView('country')}><Map size={15} aria-hidden="true" />Country</button>
        <button type="button" aria-pressed={view === 'globe'} onClick={() => setView('globe')}><Globe2 size={15} aria-hidden="true" />Globe</button>
      </div>
      <LiveMapCountryPicker value={countryCode} onChange={selectCountry} marketedCountries={markets.countries} />
    </div>
    {error ? <p className="bb-market-map-notice" role="alert">Visitor locations could not be loaded. The map is still available to explore.</p> : loading ? <p className="bb-market-map-notice" role="status">Loading visitor locations…</p> : null}
    {view === 'country' ? <LiveCountryDetail key={country.code} country={country} sessions={sessions} total={selectedTotal} usingDemo={usingDemo} embedded showStats={variant === 'live'} /> : <Suspense fallback={<div className="bb-market-globe-loading" role="status">Loading the globe…</div>}><AnalyticsLiveGlobe sessions={sessions} marketCodes={markets.countries} worldwide={markets.worldwide} initialCountry={country} onSelectCountry={selectCountry} /></Suspense>}
    {capped ? <p className="bb-market-map-notice">Showing the latest tracked visitors. Location counts and shares use the activity loaded here.</p> : null}
    <footer className="bb-live-world-footer"><span><i aria-hidden="true" />{usingDemo ? 'Demo activity' : 'Live visitor activity'}</span><span>{view === 'country' ? 'Flat country view' : 'Drag to rotate the globe'} · Locations are approximate</span></footer>
  </section>;
}
