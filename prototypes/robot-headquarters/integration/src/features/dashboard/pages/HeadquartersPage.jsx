import { useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Ellipsis, List, RefreshCw, X } from 'lucide-react';
import { navigate, workspacePagePath } from '../../../app/routing';
import { hqConfiguration, readHqMessage } from '../../../config/hqNavigation';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useWorkspaceBadges } from '../hooks/useWorkspaceBadges';
import { DemoModePanel } from '../../../shared/ui/DemoModePanel';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';
import '../styles/headquarters.css';

export function HeadquartersPage() {
  const { workspace } = useWorkspace();
  const { badgeFor, pendingRequests, pendingOrders, unreadSupport } = useWorkspaceBadges();
  const departments = useMemo(() => hqConfiguration(badgeFor), [pendingRequests, pendingOrders, unreadSupport]);
  const frameRef = useRef(null), lastDepartment = useRef(null), optionsRef = useRef(null);
  const [status, setStatus] = useState('loading');
  const [listView, setListView] = useState(false);
  const [optionsOpen, setOptionsOpen] = useState(false);
  const [activeDepartment, setActiveDepartment] = useState(null);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useDialogFocus(optionsRef, optionsOpen, () => setOptionsOpen(false));
  const configure = () => frameRef.current?.contentWindow?.postMessage({ type: 'bookbuy:hq-config', departments, reducedMotion }, window.location.origin);

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReducedMotion(preference.matches);
    update(); preference.addEventListener('change', update);
    return () => preference.removeEventListener('change', update);
  }, []);
  useEffect(() => {
    const receive = event => {
      const message = readHqMessage(event, frameRef.current?.contentWindow, window.location.origin);
      if (!message) return;
      if (message.type === 'navigate') navigate(workspacePagePath(message.tab));
      if (message.type === 'configure') configure();
      if (message.type === 'status') {
        setStatus(message.status);
        if (message.status === 'error') setActiveDepartment(null);
      }
      if (message.type === 'opened') setActiveDepartment(message.id);
      if (message.type === 'closed') { setActiveDepartment(null); lastDepartment.current?.focus(); }
    };
    window.addEventListener('message', receive); configure();
    return () => window.removeEventListener('message', receive);
  }, [departments, reducedMotion, attempt, listView]);
  useEffect(() => {
    if (listView || status !== 'loading') return undefined;
    const timeout = window.setTimeout(() => setStatus(current => current === 'loading' ? 'slow' : current), 20_000);
    return () => window.clearTimeout(timeout);
  }, [status, attempt, listView]);

  const useList = () => { setListView(true); setActiveDepartment(null); setOptionsOpen(false); };
  const retry = () => { setStatus('loading'); setListView(false); setActiveDepartment(null); setOptionsOpen(false); setAttempt(value => value + 1); };
  const openDepartment = (event, id) => {
    lastDepartment.current = event.currentTarget;
    if (status !== 'ready') { useList(); return; }
    frameRef.current?.contentWindow?.postMessage({ type: 'bookbuy:hq-open', id }, window.location.origin);
  };
  const showList = listView || status === 'error';
  return <section className={`bb-hq${showList ? ' is-list' : ''}${activeDepartment ? ' is-interacting' : ''}`} aria-labelledby="hq-title">
    <h1 id="hq-title" className="bb-hq-sr-only">Your business headquarters</h1>
    {!showList ? <iframe key={attempt} ref={frameRef} src="/hq/index.html" title="Interactive Book and Buy headquarters" className="bb-hq-scene" sandbox="allow-scripts allow-same-origin" onLoad={configure} /> : null}
    <div className="bb-hq-workspace" inert={activeDepartment ? '' : undefined}>
      <span>{workspace.brandName || 'Your business'}{workspace.isDemo ? <small>Demo</small> : null}</span>
      <button type="button" aria-label="Headquarters options" aria-haspopup="dialog" onClick={() => setOptionsOpen(true)}><Ellipsis size={19} /></button>
    </div>
    {!showList ? <nav className="bb-hq-departments" aria-label="Choose a Buddy" inert={activeDepartment ? '' : undefined}>
      <p>Choose a Buddy<span>Your business, all in one place</span></p>
      <div>{departments.map(group => <button type="button" key={group.id} style={{ '--hq-colour': group.colour }} onClick={event => openDepartment(event, group.id)} aria-label={`Open ${group.name}${group.badge ? `, ${group.badge} needing attention` : ''}`}>
        <span className="bb-hq-buddy-icon" aria-hidden="true"><Bot size={21} /></span><span>{group.name}</span>{group.badge > 0 ? <small className="bb-hq-badge">{group.badge > 99 ? '99+' : group.badge}</small> : null}
      </button>)}</div>
    </nav> : <div className="bb-hq-page-list">
      <header><h2>Your business headquarters</h2><p>{status === 'error' ? 'The 3D office couldn’t open. All your pages are ready here.' : 'Choose a department and get straight to work.'}</p><button type="button" onClick={retry}><RefreshCw size={16} />Open 3D office</button></header>
      <nav aria-label="Headquarters pages">{departments.map(group => <section key={group.id} style={{ '--hq-colour': group.colour }}>
        <h3><Bot size={20} aria-hidden="true" />{group.name}</h3><p>{group.role}</p>
        <div>{group.features.map(feature => <a key={feature.id} href={`#${workspacePagePath(feature.id)}`}>{feature.label}{feature.badge > 0 ? <span>{feature.badge}</span> : null}</a>)}</div>
      </section>)}</nav>
    </div>}
    {status === 'slow' && !showList && !activeDepartment ? <div className="bb-hq-slow" role="status">The office is taking a little longer.<button type="button" onClick={useList}>Open page list</button></div> : null}
    {optionsOpen ? <div className="bb-hq-options-overlay" onClick={event => { if (event.target === event.currentTarget) setOptionsOpen(false); }}>
      <section ref={optionsRef} className="bb-hq-options" role="dialog" aria-modal="true" aria-labelledby="hq-options-title" tabIndex={-1}>
        <header><h2 id="hq-options-title">Your headquarters</h2><button type="button" aria-label="Close headquarters options" onClick={() => setOptionsOpen(false)}><X size={18} /></button></header>
        <button className="bb-hq-options-link" type="button" onClick={useList}><List size={18} />Use page list<span>Every page, in a simple view</span></button>
        <a className="bb-hq-options-link" href={`#${workspacePagePath('settings')}/account`}>Account settings<span>Your account and sign out</span></a>
        {workspace.isDemo ? <DemoModePanel /> : null}
      </section>
    </div> : null}
  </section>;
}
