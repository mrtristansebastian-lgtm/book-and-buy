import { useEffect, useMemo, useRef, useState } from 'react';
import { Minus, Plus, RotateCcw } from 'lucide-react';
import geography from '../assets/worldGlobe.json';
import { clusterGlobeSessions, DEFAULT_GLOBE_ROTATION, globeCountryAt, globePointFromScreen, normalizeGlobeRotation, projectGlobePoint, resolveGlobeCountry } from '../utils/liveGlobeGeometry';
import { createGlobeTexture, createLiveGlobeRenderer } from '../utils/liveGlobeRenderer';
import './live-globe.css';

export function AnalyticsLiveGlobe({ sessions = [], marketCodes = [], worldwide = false, initialCountry = null, onSelectCountry }) {
  const initialCode = String(initialCountry?.iso2 || '').toUpperCase();
  const home = useMemo(() => {
    const country = geography.countries.find(country => country.iso2 === initialCode);
    return country?.center ? normalizeGlobeRotation({ longitude: country.center[0], latitude: country.center[1] }) : DEFAULT_GLOBE_ROTATION;
  }, [initialCode]);
  const [rotation, setRotation] = useState(home); const [zoom, setZoom] = useState(1);
  const [size, setSize] = useState({ width: 800, height: 490 });
  const [active, setActive] = useState(null); const [rendererError, setRendererError] = useState(false);
  const [restoreVersion, setRestoreVersion] = useState(0); const [dragging, setDragging] = useState(false);
  const stageRef = useRef(null); const canvasRef = useRef(null); const rendererRef = useRef(null);
  const dragRef = useRef(null); const hoverFrame = useRef(null);
  const normalizedSessions = useMemo(() => sessions.map(session => ({ ...session, country: resolveGlobeCountry(session.country, geography.countries)?.iso2 || '' })), [sessions]);
  const clusters = useMemo(() => clusterGlobeSessions(normalizedSessions), [normalizedSessions]);
  const trafficCodes = useMemo(() => [...new Set(normalizedSessions.map(session => session.country).filter(Boolean))], [normalizedSessions]);
  const marketKey = [...marketCodes].sort().join(','); const trafficKey = trafficCodes.sort().join(',');
  const texture = useMemo(() => typeof document === 'undefined' ? null : createGlobeTexture(geography.countries, marketCodes, trafficCodes, worldwide), [marketKey, trafficKey, worldwide]);

  useEffect(() => { setRotation(home); setZoom(1); setActive(null); }, [home]);
  useEffect(() => () => { if (hoverFrame.current) cancelAnimationFrame(hoverFrame.current); }, []);
  useEffect(() => {
    const stage = stageRef.current;
    const measure = () => { const bounds = stage.getBoundingClientRect(); setSize({ width: bounds.width, height: bounds.height }); };
    measure(); const observer = new ResizeObserver(measure); observer.observe(stage);
    return () => observer.disconnect();
  }, []);
  useEffect(() => {
    const canvas = canvasRef.current;
    try { rendererRef.current = createLiveGlobeRenderer(canvas, texture); setRendererError(false); }
    catch { setRendererError(true); }
    const lost = event => { event.preventDefault(); setRendererError(true); };
    const restored = () => setRestoreVersion(value => value + 1);
    canvas.addEventListener('webglcontextlost', lost); canvas.addEventListener('webglcontextrestored', restored);
    return () => { rendererRef.current?.dispose(); rendererRef.current = null; canvas.removeEventListener('webglcontextlost', lost); canvas.removeEventListener('webglcontextrestored', restored); };
  }, [restoreVersion]);
  useEffect(() => { rendererRef.current?.updateTexture(texture); }, [texture, restoreVersion]);
  useEffect(() => {
    const frame = requestAnimationFrame(() => rendererRef.current?.render(rotation, size.width, size.height, zoom));
    return () => cancelAnimationFrame(frame);
  }, [rotation, zoom, size, texture, restoreVersion]);

  const pointAtEvent = event => {
    const bounds = stageRef.current.getBoundingClientRect();
    return globePointFromScreen(event.clientX - bounds.left, event.clientY - bounds.top, rotation, bounds.width, bounds.height, zoom);
  };
  const selectAt = event => {
    const point = pointAtEvent(event); const country = point && globeCountryAt(geography.countries, point.longitude, point.latitude);
    if (/^[A-Z]{2}$/.test(country?.iso2 || '')) onSelectCountry?.(country.iso2);
  };
  const pointerDown = event => {
    if (event.target.closest('button') || event.button !== 0) return;
    if (hoverFrame.current) { cancelAnimationFrame(hoverFrame.current); hoverFrame.current = null; }
    dragRef.current = { id: event.pointerId, x: event.clientX, y: event.clientY, rotation, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId); setDragging(true); setActive(null);
  };
  const pointerMove = event => {
    const drag = dragRef.current;
    if (drag && drag.id === event.pointerId) {
      const dx = event.clientX - drag.x; const dy = event.clientY - drag.y;
      if (Math.hypot(dx, dy) > 5) drag.moved = true;
      setRotation(normalizeGlobeRotation({ longitude: drag.rotation.longitude - dx * .24 / zoom, latitude: drag.rotation.latitude + dy * .24 / zoom }));
    } else if (event.pointerType !== 'touch' && !event.target.closest('button')) {
      if (hoverFrame.current) cancelAnimationFrame(hoverFrame.current);
      const location = { clientX: event.clientX, clientY: event.clientY };
      hoverFrame.current = requestAnimationFrame(() => {
        const point = pointAtEvent(location); const country = point && globeCountryAt(geography.countries, point.longitude, point.latitude);
        setActive(current => current?.code === country?.iso2 ? current : country ? { name: country.name, code: country.iso2, count: normalizedSessions.filter(session => session.country === country.iso2).length } : null);
        hoverFrame.current = null;
      });
    }
  };
  const pointerUp = event => {
    const drag = dragRef.current;
    if (!drag || drag.id !== event.pointerId) return;
    if (!drag.moved) selectAt(event);
    dragRef.current = null; setDragging(false);
  };
  const reset = () => { setRotation(home); setZoom(1); setActive(null); };
  const keyDown = event => {
    if (event.target.closest('button')) return;
    const directions = { ArrowLeft: [12, 0], ArrowRight: [-12, 0], ArrowUp: [0, -10], ArrowDown: [0, 10] };
    if (directions[event.key]) { event.preventDefault(); const [lng, lat] = directions[event.key]; setRotation(current => normalizeGlobeRotation({ longitude: current.longitude + lng, latitude: current.latitude + lat })); setActive(null); }
    else if (event.key === 'Home') { event.preventDefault(); reset(); }
    else if (event.key === '+' || event.key === '=') { event.preventDefault(); setZoom(value => Math.min(1.2, value + .1)); }
    else if (event.key === '-') { event.preventDefault(); setZoom(value => Math.max(.75, value - .1)); }
    else if (event.key === 'Escape') setActive(null);
    else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      const point = globePointFromScreen(size.width / 2, size.height / 2, rotation, size.width, size.height, zoom);
      const country = point && globeCountryAt(geography.countries, point.longitude, point.latitude);
      if (/^[A-Z]{2}$/.test(country?.iso2 || '')) onSelectCountry?.(country.iso2);
    }
  };
  const pins = clusters.map(cluster => ({ ...cluster, point: projectGlobePoint(cluster.longitude, cluster.latitude, rotation, size.width, size.height, zoom) })).filter(cluster => cluster.point);
  const activeCount = active?.code ? normalizedSessions.filter(session => session.country === active.code).length : active?.count || 0;
  return <div className={`bb-live-globe${dragging ? ' is-dragging' : ''}`}>
    <div ref={stageRef} className="bb-live-globe-stage" role="group" tabIndex={0}
      aria-label="Interactive 3D globe. Drag or use arrow keys to rotate. Click a country or press Enter or Space to open the country at the center. Home resets the view."
      onKeyDown={keyDown} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp}
      onPointerCancel={() => { dragRef.current = null; setDragging(false); }} onPointerLeave={() => { if (hoverFrame.current) { cancelAnimationFrame(hoverFrame.current); hoverFrame.current = null; } if (!dragRef.current) setActive(null); }}>
      <canvas ref={canvasRef} className="bb-live-globe-canvas" aria-hidden="true" />
      <div className="bb-live-globe-controls" aria-label="Globe controls">
        <button type="button" disabled={zoom >= 1.2} onClick={() => setZoom(value => Math.min(1.2, value + .1))} aria-label="Zoom in globe"><Plus size={16} /></button>
        <button type="button" disabled={zoom <= .75} onClick={() => setZoom(value => Math.max(.75, value - .1))} aria-label="Zoom out globe"><Minus size={16} /></button>
        <button type="button" onClick={reset} aria-label="Reset globe view"><RotateCcw size={15} /></button>
      </div>
      {!rendererError && pins.map(cluster => {
        const countryCode = String(cluster.sessions[0]?.country || '').toUpperCase();
        const country = geography.countries.find(country => country.iso2 === countryCode) || globeCountryAt(geography.countries, cluster.longitude, cluster.latitude);
        const selectedCode = /^[A-Z]{2}$/.test(country?.iso2 || '') ? country.iso2 : null;
        return <button key={cluster.id} type="button" className="bb-live-globe-pin" style={{ left: cluster.point.x, top: cluster.point.y }}
          aria-label={`${cluster.count} ${cluster.count === 1 ? 'visitor' : 'visitors'} near ${country?.name || cluster.sessions[0]?.city || 'this location'}. Open country map.`}
          onClick={() => selectedCode && onSelectCountry?.(selectedCode)} disabled={!selectedCode}
          onPointerEnter={() => setActive({ name: country?.name || 'Approximate location', code: selectedCode, count: cluster.count })}
          onFocus={() => setActive({ name: country?.name || 'Approximate location', code: selectedCode, count: cluster.count })} onBlur={() => setActive(null)}>
          <span aria-hidden="true">{cluster.count > 1 ? cluster.count : ''}</span>
        </button>;
      })}
      {active && !dragging && !rendererError ? <div className="bb-live-globe-callout" role="status"><strong>{active.name}</strong><span>{activeCount} live {activeCount === 1 ? 'visitor' : 'visitors'}</span><small>Open country map</small></div> : null}
      {rendererError ? <p className="bb-live-globe-unavailable" role="status">The globe is unavailable on this device. Choose a country above to explore its map.</p> : null}
    </div>
    <div className="bb-live-globe-footer"><div className="bb-live-globe-legend">{(worldwide || marketCodes.length > 0) && <span><i className="is-market" />Your markets</span>}<span><i className="is-active" />Live visitors</span></div><span>Drag to rotate · Select a country</span></div>
  </div>;
}
