import { memo, useEffect, useId, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, Minus, Plus, RotateCcw } from 'lucide-react';
import worldMap from '../assets/worldEqualEarth.json';
import { LiveCountryDetail } from './LiveCountryDetail';

// The detailed Natural Earth paths stay memoized while live presence updates.
const MapAreas = memo(function MapAreas({ areas, level }) {
  return areas.map((area, index) => (
    <path key={`${level}-${index}`} d={area.path}
      className={`bb-live-world-area is-${level}`}
      data-area-id={`${level}:${index}`} />
  ));
});

export function AnalyticsLiveWorldMap({
  sessions = [],
  total = 0,
  totalLabel = String(total || 0),
  now = Date.now(),
  loading = false,
  error = '',
  usingDemo = false,
  variant = 'live',
  onOpenLiveStats
}) {
  const [detailCountry, setDetailCountry] = useState(null);
  const gradientId = `traffic-${useId().replace(/:/g, '')}`;
  const countryCounts = useMemo(() => {
    const counts = new Map();
    for (const session of sessions) {
      const value = String(session.country || '').trim().toLowerCase();
      const country = worldMap.countries.find((area) => area.iso2?.toLowerCase() === value || area.name.toLowerCase() === value || area.code.toLowerCase() === value);
      if (country) counts.set(country.code, (counts.get(country.code) || 0) + 1);
    }
    return counts;
  }, [sessions]);
  const [selectedArea, setSelectedArea] = useState(null);
  const [hoveredArea, setHoveredArea] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const dragRef = useRef(null);
  const stageRef = useRef(null);
  const [stageSize, setStageSize] = useState({ width: 1000, height: 500 });
  useEffect(() => {
    const element = stageRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver(([entry]) => setStageSize({ width: entry.contentRect.width, height: entry.contentRect.height }));
    observer.observe(element);
    return () => observer.disconnect();
  }, [detailCountry]);
  const suppressClick = useRef(false);
  const activeArea = hoveredArea ?? selectedArea;
  const visitorWord = Number(total) === 1 ? 'visitor' : 'visitors';
  const statusText = error
    ? 'Live locations unavailable'
    : loading
      ? 'Connecting live map…'
      : total === 0
        ? 'Waiting for live visitors'
        : countryCounts.size === 0
          ? 'Visitor locations are still resolving'
          : '';

  const setMapZoom = (nextZoom) => {
    const value = Math.min(2.8, Math.max(1, Number(nextZoom.toFixed(2))));
    setZoom(value);
    setSelectedArea(null);
    setHoveredArea(null);
    const rect = stageRef.current?.getBoundingClientRect();
    if (rect) setPan((current) => ({
      x: Math.max(-rect.width * (value - 1) / 2, Math.min(rect.width * (value - 1) / 2, current.x)),
      y: Math.max(-rect.height * (value - 1) / 2, Math.min(rect.height * (value - 1) / 2, current.y))
    }));
  };
  const handlePointerDown = (event) => {
    suppressClick.current = false;
    if (zoom === 1 || event.target.closest('button')) return;
    dragRef.current = { pointerId: event.pointerId, x: event.clientX, y: event.clientY, startX: event.clientX, startY: event.clientY };
  };
  const handlePointerMove = (event) => {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    const previous = dragRef.current;
    if (!suppressClick.current && Math.hypot(event.clientX - previous.startX, event.clientY - previous.startY) < 5) return;
    suppressClick.current = true;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    setHoveredArea(null);
    setSelectedArea(null);
    dragRef.current = { ...previous, x: event.clientX, y: event.clientY };
    const rect = event.currentTarget.getBoundingClientRect();
    const limitX = rect.width * (zoom - 1) / 2;
    const limitY = rect.height * (zoom - 1) / 2;
    setPan((current) => ({
      x: Math.max(-limitX, Math.min(limitX, current.x + event.clientX - previous.x)),
      y: Math.max(-limitY, Math.min(limitY, current.y + event.clientY - previous.y))
    }));
  };
  const stopDragging = () => { dragRef.current = null; };
  const getAreaTarget = (event) => event.target.closest?.('[data-area-id]');
  const areaFromTarget = (target, event) => {
    if (!target) return null;
    const [level, rawIndex] = target.getAttribute('data-area-id').split(':');
    const source = worldMap.countries;
    const area = source[Number(rawIndex)];
    if (!area) return null;
    const rect = event.currentTarget.ownerSVGElement?.getBoundingClientRect?.() || event.currentTarget.getBoundingClientRect?.();
    const point = rect && event.clientX ? [
      (event.clientX - rect.left) / rect.width * worldMap.width,
      (event.clientY - rect.top) / rect.height * worldMap.height
    ] : area.center || [worldMap.width / 2, worldMap.height / 2];
    return { id: `${level}:${rawIndex}`, path: area.path, country: area.name, code: area.code,
      region: '', x: point[0], y: point[1] };
  };
  const handleAreaOver = (event) => {
    const target = getAreaTarget(event);
    if (target) setHoveredArea(areaFromTarget(target, event));
  };
  const handleAreaOut = (event) => {
    const target = getAreaTarget(event);
    const related = event.relatedTarget?.closest?.('[data-area-id]');
    if (target && related?.getAttribute('data-area-id') === target.getAttribute('data-area-id')) return;
    setHoveredArea(null);
  };
  const handleAreaClick = (event) => {
    if (suppressClick.current) return;
    const target = getAreaTarget(event);
    if (!target) return;
    const area = areaFromTarget(target, event);
    setDetailCountry(worldMap.countries[Number(target.getAttribute('data-area-id').split(':')[1])]);
  };
  const handleMapKey = (event) => {
    if (event.key === 'Enter' && activeArea) { setDetailCountry(worldMap.countries.find((area) => area.name === activeArea.country)); return; }
    if (event.key === 'Escape') { setHoveredArea(null); setSelectedArea(null); return; }
    const directions = { ArrowRight: [1, 0], ArrowLeft: [-1, 0], ArrowDown: [0, 1], ArrowUp: [0, -1] };
    const direction = directions[event.key];
    if (!direction) return;
    event.preventDefault();
    const areas = worldMap.countries;
    const start = activeArea ? [activeArea.x, activeArea.y] : [worldMap.width / 2, worldMap.height / 2];
    let best = null; let distance = Infinity;
    areas.forEach((area, index) => {
      const [x, y] = area.center || [worldMap.width / 2, worldMap.height / 2];
      const dx = x - start[0]; const dy = y - start[1];
      const forward = dx * direction[0] + dy * direction[1];
      if (forward <= .1) return;
      const score = Math.hypot(dx, dy) + 2 * Math.abs(dx * direction[1] - dy * direction[0]);
      if (score < distance) { best = { id: `country:${index}`, path: area.path,
        country: area.name, code: area.code, region: '', x, y }; distance = score; }
    });
    if (best !== null) { setHoveredArea(null); setSelectedArea(best); }
  };

  if (detailCountry) return <LiveCountryDetail country={detailCountry} sessions={sessions} total={countryCounts.get(detailCountry.code) || 0} usingDemo={usingDemo} onBack={() => { setDetailCountry(null); setHoveredArea(null); setSelectedArea(null); }} />;
  return (
    <section className={`bb-live-world-map is-${variant}`} aria-label="Live visitor world map">
      <header className="bb-live-world-head">
        <div className="bb-live-world-heading">
          <p className="bb-live-world-eyebrow">Live world</p>
          <h2>Your visitors. Worldwide.</h2>
        </div>
        <div className="bb-live-world-meta">
          <span className="bb-live-world-count">
            <span className="bb-live-world-count-dot" aria-hidden="true" />
            <strong>{totalLabel}</strong>
            <span>{visitorWord}</span>
          </span>
          <span className="bb-live-world-window">Past 5 min</span>
          {usingDemo ? <span className="bb-live-world-demo">Demo</span> : null}
          {variant === 'home' && onOpenLiveStats ? (
            <button type="button" className="bb-live-world-open" onClick={onOpenLiveStats}>
              Open Live Stats
              <ArrowUpRight size={15} strokeWidth={2.2} aria-hidden="true" />
            </button>
          ) : null}
        </div>
      </header>

      <div
        ref={stageRef}
        className={`bb-live-world-stage${zoom > 1 ? ' is-zoomed' : ''}`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={stopDragging}
        onPointerCancel={stopDragging}
      >
        <div className="bb-live-world-controls" aria-label="Map controls">
          <button type="button" onClick={() => setMapZoom(zoom + 0.35)} disabled={zoom >= 2.8} aria-label="Zoom in"><Plus size={16} /></button>
          <button type="button" onClick={() => setMapZoom(zoom - 0.35)} disabled={zoom <= 1} aria-label="Zoom out"><Minus size={16} /></button>
          <button type="button" onClick={() => setMapZoom(1)} disabled={zoom === 1 && pan.x === 0 && pan.y === 0} aria-label="Reset map view"><RotateCcw size={14} /></button>
        </div>
        <div className="bb-live-world-canvas" style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, '--map-zoom': zoom }}>
        <svg
          className="bb-live-world-svg"
          viewBox={`0 0 ${worldMap.width} ${worldMap.height}`}
          role="group"
          tabIndex={0}
          onKeyDown={handleMapKey}
          aria-label={`World map with ${totalLabel} active ${visitorWord}. Use arrow keys to explore countries. Escape closes the callout.`}
          preserveAspectRatio="xMidYMid meet"
        >
          <defs><clipPath id={gradientId}>{worldMap.countries.filter((area) => countryCounts.has(area.code)).map((area) => <path key={area.code} d={area.path} />)}</clipPath></defs>
          <g className="bb-live-world-countries" aria-label="World map countries"
            onPointerOver={handleAreaOver}
            onPointerOut={handleAreaOut}
            onClick={handleAreaClick}>
            <MapAreas areas={worldMap.countries} level="country" />
          </g>
          <foreignObject x="0" y="0" width="1000" height="500" clipPath={`url(#${gradientId})`} pointerEvents="none"><div className="bb-live-world-traffic-gradient" /></foreignObject>
          {activeArea ? <path d={activeArea.path} className="bb-live-world-country-outline" pointerEvents="none" /> : null}
        </svg>


        </div>

        {activeArea ? (
          <div className="bb-live-world-hex-tooltip" role="status" style={{
            '--map-x': `${Math.max(92, Math.min(stageSize.width - 92, stageSize.width / 2 + (activeArea.x / worldMap.width - .5) * stageSize.width * zoom + pan.x))}px`,
            '--map-y': `${Math.max(76, Math.min(stageSize.height - 8, stageSize.height / 2 + (activeArea.y / worldMap.height - .5) * stageSize.height * zoom + pan.y))}px`
          }}>
            <strong>{activeArea.country}</strong>
            <span>{countryCounts.get(activeArea.code) || 0} live visitors</span>
            <small>Click to explore states & provinces</small>
          </div>
        ) : null}

        {statusText ? <p className={`bb-live-world-state${error ? ' is-error' : ''}`}>{statusText}</p> : null}
      </div>
      <footer className="bb-live-world-footer"><span><i aria-hidden="true" /> {usingDemo ? 'Demo activity' : 'Live visitor activity'}</span><span>{zoom > 1 ? 'Drag to explore · ' : 'Hover or press a country · '}Visitor locations are approximate</span></footer>
    </section>
  );
}
