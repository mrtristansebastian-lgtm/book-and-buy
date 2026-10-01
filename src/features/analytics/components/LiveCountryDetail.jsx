import { useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Minus, Plus, RotateCcw } from 'lucide-react';
import { REGIONAL_MAP_COUNTRIES, countrySessions, regionStats } from '../utils/regionalTraffic';

const cache = new Map();

export function LiveCountryDetail({ country, sessions, total, usingDemo, onBack }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(null);
  const [panel, setPanel] = useState('main');
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef(null);
  const moved = useRef(false);
  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); setActive(null); };
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
    <header className="bb-live-world-head"><div className="bb-live-world-heading"><p className="bb-live-world-eyebrow">Live country · States & provinces</p><h2>{country.name}</h2></div><div className="bb-live-world-meta"><span className="bb-live-world-count"><span className="bb-live-world-count-dot" /><strong>{total}</strong><span>live visitors</span></span><span className="bb-live-world-window">Past 5 min</span>{usingDemo && <span className="bb-live-world-demo">Demo</span>}<button className="bb-live-world-open" onClick={onBack}><ArrowLeft size={15} />World view</button></div></header>
    {data?.panels.length > 1 && <div className="bb-live-country-panels" aria-label="Country areas">{data.panels.map((item) => <button type="button" key={item.id} aria-pressed={selectedPanel?.id === item.id} onClick={() => { setPanel(item.id); resetView(); }}>{item.label}</button>)}</div>}
    {hasMap && <div className={`bb-live-world-stage bb-live-country-stage${zoom > 1 ? ' is-zoomed' : ''}`}
      onPointerDown={(event) => { moved.current = false; if (zoom > 1 && !event.target.closest('button')) drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY }; }}
      onPointerMove={(event) => {
        const previous = drag.current;
        if (!previous || previous.id !== event.pointerId) return;
        const dx = event.clientX - previous.x; const dy = event.clientY - previous.y;
        if (!moved.current && Math.hypot(dx, dy) < 5) return;
        moved.current = true; event.currentTarget.setPointerCapture(event.pointerId); setActive(null);
        const rect = event.currentTarget.getBoundingClientRect();
        setPan((value) => ({ x: Math.max(-rect.width * (zoom - 1) / 2, Math.min(rect.width * (zoom - 1) / 2, value.x + dx)), y: Math.max(-rect.height * (zoom - 1) / 2, Math.min(rect.height * (zoom - 1) / 2, value.y + dy)) }));
        drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY };
      }} onPointerUp={() => { drag.current = null; }} onPointerCancel={() => { drag.current = null; }}>
      <div className="bb-live-world-controls" aria-label="Regional map controls">
        <button type="button" aria-label="Zoom in regional map" disabled={zoom >= 4} onClick={() => setZoom((value) => Math.min(4, value + .5))}><Plus size={16} /></button>
        <button type="button" aria-label="Zoom out regional map" disabled={zoom === 1} onClick={() => { setZoom((value) => Math.max(1, value - .5)); setPan({ x: 0, y: 0 }); }}><Minus size={16} /></button>
        <button type="button" aria-label="Reset regional map view" disabled={zoom === 1} onClick={resetView}><RotateCcw size={15} /></button>
      </div>
      <div className="bb-live-country-canvas" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
      <svg className="bb-live-country-svg" viewBox="0 0 1000 500" role="group" aria-label={`${country.name} provinces and states`}>
        <defs><clipPath id={id}>{regions.filter((area) => counts.has(area.name)).map((area) => <path key={area.name} d={area.path} />)}</clipPath></defs>
        {regions.map((area) => <path key={area.id} d={area.path} className="bb-live-country-land" />)}
        {regions.length > 0 && <foreignObject x="0" y="0" width="1000" height="500" clipPath={`url(#${id})`} pointerEvents="none"><div className="bb-live-world-traffic-gradient" /></foreignObject>}
        {selectedPanel?.borders && <path d={selectedPanel.borders} className="bb-live-country-borders" />}
        {regions.map((area) => <path key={`hit-${area.id}`} d={area.path} className="bb-live-world-country-hit" tabIndex={0} role="button" aria-label={`${area.name}, ${counts.get(area.name) || 0} live visitors`} onPointerEnter={() => { if (!drag.current) setActive(area); }} onPointerLeave={() => setActive(null)} onFocus={() => setActive(area)} onBlur={() => setActive(null)} onClick={() => { if (!moved.current) setActive(area); }} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); setActive(area); } if (event.key === 'Escape') setActive(null); }} />)}
      </svg>
      </div>
      {active && <div className="bb-live-world-country-card" role="status"><strong>{active.name}</strong><span>{counts.get(active.name) || 0} live visitors</span><small>{country.name}</small></div>}
      {!data && <p className="bb-live-world-state">{error || 'Loading country detail…'}</p>}
      {data && !regions.length && <p className="bb-live-world-state">No province/state divisions available.</p>}
    </div>}
    <div className="bb-live-country-stats" aria-label="Live visitors by region">
      <h3>Live visitors by region</h3>
      {!hasMap && <p className="bb-muted">Regional traffic breakdown</p>}
      {stats.length ? <ul>{stats.map((row) => <li key={row.name}><span>{row.name}</span><strong>{row.count}<small>{row.count === 1 ? ' visitor' : ' visitors'}</small></strong></li>)}</ul> : <p className="bb-muted">No active visitors in this country.</p>}
      {hasMap && stats.some((row) => !row.mapped) && <p className="bb-muted">Unmatched regions remain in these totals; they are not assigned to a map shape.</p>}
    </div>
    <footer className="bb-live-world-footer"><span><i />{usingDemo ? 'Demo activity' : 'Live visitor activity'}</span><span>IP locations are approximate</span></footer>
    {data?.source && <details className="bb-live-country-source"><summary>Map source & boundary date</summary><p>{data.source.name} · {data.source.year} · {data.source.license}</p><p>{data.source.attribution}</p><a href={data.source.url} target="_blank" rel="noreferrer">Source details</a></details>}
  </section>;
}
