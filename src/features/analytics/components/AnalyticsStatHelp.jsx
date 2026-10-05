import { useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ArrowUpRight, CircleHelp, X } from 'lucide-react';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';

export function AnalyticsStatHelp({ metric, available, href, onClose }) {
  const panelRef = useRef(null);
  const titleId = useId();
  const descriptionId = useId();
  const countsVisitors = metric.visitorBased;
  useDialogFocus(panelRef, true, onClose);
  if (typeof document === 'undefined') return null;

  return createPortal(<div className="bb-report-help-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}>
    <section ref={panelRef} tabIndex={-1} className="native-ui bb-report-help-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={descriptionId}>
      <header className="bb-report-help-head">
        <span className="bb-report-help-symbol" aria-hidden="true"><CircleHelp size={22} strokeWidth={1.7} /></span>
        <button type="button" className="bb-report-help-close" onClick={onClose} aria-label="Close explanation"><X size={18} /></button>
      </header>
      <span className="bb-report-help-category">{metric.groupTitle}</span>
      <h2 id={titleId}>{metric.label}</h2>
      <p id={descriptionId}>{metric.description}</p>
      {countsVisitors ? <p className="bb-report-help-counting">Visitors are counted by browser. Using another browser may count again.</p> : null}
      {available === false ? <p className="bb-report-help-notice">We don't have this stat for your chosen dates yet. New activity will fill it in.</p> : null}
      <footer>{href ? <a href={href} onClick={onClose}>Explore trend & history<ArrowUpRight size={15} aria-hidden="true" /></a> : <span>Use the period switcher to explore a different time.</span>}</footer>
    </section>
  </div>, document.body);
}
