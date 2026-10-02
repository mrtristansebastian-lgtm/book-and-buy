import { useEffect, useId, useMemo, useState } from 'react';
import { ArrowLeft, Minus, Plus, RotateCcw } from 'lucide-react';
import { REGIONAL_MAP_COUNTRIES, countrySessions, regionStats } from '../utils/regionalTraffic';
import { useMapViewport } from '../hooks/useMapViewport';

const cache = new Map();

export function LiveCountryDetail({ country, sessions, total, usingDemo, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [panel, setPanel] = useState('main');
  const viewport = useMapViewport({ onGesture: () => setActive(null) });
  const { zoom } = viewport;
  const resetView = viewport.reset;
  const hasMap = !!REGIONAL_MAP_COUNTRIES[country.iso2];
  const id = `regions-${useId().replace(/:/g, '')}`;
  useEffect(() => {
    setData(null); setError(''); setActive(null); setPanel('main');
    if (!hasMap) return undefined;
    const controller = new AbortController();
    if (cache.has(country.code)) setData(cache.get(country.code));
    else fetch(`/maps/regions/${REGIONAL_MAP_COUNTRIES[country.iso2]}.json`, { signal: controller.signal })
      .then((response) => { if (!response.ok) throw new Error('Country detail unavailable'); return response.json(); })
      .then((value) => { cache.set(country.code, value); setData(value); })
      .catch((failure) => { if (failure.name !== 'AbortError') setError('Country detail is unavailable.'); });
    return () => controller.abort();
  }, [country.code, country.iso2, hasMap]);
  const stats = useMemo(() => regionStats(countrySessions(country, sessions), data?.regions), [sessions, country, data]);
  const counts = useMemo(() => new Map(stats.filter((row) => row.mapped).map((row) => [row.name, row.count])), [stats]);
  const selectedPanel = data?.panels.find((item) => item.id === panel) || data?.panels[0];
  const regions = selectedPanel?.regions || [];
  return <section className="bb-live-world-map" aria-label={`${country.name} live visitor detail`}>
    <header className="bb-live-world-head"><div className="bb-live-world-heading"><p className="bb-live-world-eyebrow">Live country · {hasMap ? 'States & provinces' : 'Regional statistics'}</p><h2>{country.name}</h2></div><div className="bb-live-world-meta"><span className="bb-live-world-count"><span className="bb-live-world-count-dot" /><strong>{total}</strong><span>{total === 1 ? 'live visitor' : 'live visitors'}</span></span><span className="bb-live-world-window">Past 5 min</span>{usingDemo && <span className="bb-live-world-demo">Demo</span>}<button className="bb-live-world-open" onClick={onBack}><ArrowLeft size={15} />World view</button></div></header>
    {data?.panels.length > 1 && <div className="bb-live-country-panels" aria-label="Country areas">{data.panels.map((item) => <button type="button" key={item.id} aria-pressed={selectedPanel?.id === item.id} onClick={() => { setPanel(item.id); resetView(); }}>{item.label}</button>)}</div>}
    {hasMap && <div ref={viewport.stageRef} className={`bb-live-world-stage bb-live-country-stage${zoom > 1 ? ' is-zoomed' : ''}`} {...viewport.bind}>
      <div className="bb-live-world-controls" aria-label="Regional map controls">
        <button type="button" aria-label="Zoom in regional map" disabled={zoom >= 4} onClick={() => viewport.setZoom(zoom + .5)}><Plus size={16} /></button>
        <button type="button" aria-label="Zoom out regional map" disabled={zoom === 1} onClick={() => viewport.setZoom(zoom - .5)}><Minus size={16} /></button>
        <button type="button" aria-label="Reset regional map view" disabled={zoom === 1} onClick={resetView}><RotateCcw size={15} /></button>
      </div>
      <div className="bb-live-country-canvas">
      <svg className="bb-live-country-svg" viewBox={viewport.viewBox} role="group" aria-label={`${country.name} provinces and states`}>
        <defs><clipPath id={id}>{regions.filter((area) => counts.has(area.name)).map((area) => <path key={area.name} d={area.path} />)}</clipPath></defs>
        {regions.map((area) => <path key={area.id} d={area.path} className="bb-live-country-land" />)}
        {regions.length > 0 && <foreignObject x="0" y="0" width="1000" height="500" clipPath={`url(#${id})`} pointerEvents="none"><div className="bb-live-world-traffic-gradient" /></foreignObject>}
        {selectedPanel?.borders && <path d={selectedPanel.borders} className="bb-live-country-borders" />}
        {regions.map((area) => <path key={`hit-${area.id}`} d={area.path} className="bb-live-world-country-hit" tabIndex={0} role="button" aria-label={`${area.name}, ${counts.get(area.name) || 0} live visitors`} onPointerEnter={(event) => { if (!viewport.isGesturing() && event.pointerType !== 'touch') setActive({ ...area, ...viewport.pointFromEvent(event) }); }} onPointerLeave={() => setActive(null)} onFocus={() => setActive({ ...area, x: area.center?.[0] ?? 500, y: area.center?.[1] ?? 250 })} onBlur={() => setActive(null)} onClick={(event) => { if (!viewport.suppressClick.current) setActive({ ...area, ...viewport.pointFromEvent(event) }); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive({ ...area, x: area.center?.[0] ?? 500, y: area.center?.[1] ?? 250 }); } if (event.key === 'Escape') setActive(null); }} />)}
      </svg>
      </div>
      {active && <div className="bb-live-world-hex-tooltip" style={viewport.tooltip(active)} role="status"><strong>{active.name}</strong><span>{counts.get(active.name) || 0} live visitors</span><small>{country.name}</small></div>}
      {!data && <p className="bb-live-world-state">{error || 'Loading country detail…'}</p>}
      {data && !regions.length && <p className="bb-live-world-state">No province/state divisions available.</p>}
    </div>}
    <div className="bb-live-country-stats" aria-label="Live visitors by region">
      <header className="bb-live-region-head"><div><p className="bb-live-world-eyebrow">Right now · Past 5 min</p><h3>Live visitors by region</h3></div><span className="bb-live-region-total"><i aria-hidden="true" /><strong>{total}</strong><span>{total === 1 ? 'visitor' : 'visitors'}</span></span></header>
      {!hasMap && <p className="bb-muted">Regional traffic breakdown</p>}
      {stats.length ? <ul>{stats.map((row) => <li key={row.name}><div className="bb-live-region-label"><span>{row.name}</span>{!row.mapped && hasMap && <small>Location not matched to map</small>}<div className="bb-live-region-track" aria-hidden="true"><span style={{ width: `${total ? row.count / total * 100 : 0}%` }} /></div></div><strong>{row.count}<small>{row.count === 1 ? ' visitor' : ' visitors'}</small></strong><span className="bb-live-region-share">{total ? Math.round(row.count / total * 100) : 0}%</span></li>)}</ul> : <div className="bb-live-region-empty"><strong>No visitors right now</strong><p>New activity appears here automatically.</p></div>}
      {hasMap && stats.some((row) => !row.mapped) && <p className="bb-muted">Unmatched regions remain in these totals; they are not assigned to a map shape.</p>}
    </div>
    <footer className="bb-live-world-footer"><span><i />{usingDemo ? 'Demo activity' : 'Live visitor activity'}</span><span>IP locations are approximate</span></footer>
    {data?.source && <details className="bb-live-country-source"><summary>Map source & boundary date</summary><p>{data.source.name} · {data.source.year} · {data.source.license}</p><p>{data.source.attribution}</p><a href={data.source.url} target="_blank" rel="noreferrer">Source details</a></details>}
  </section>;
}
