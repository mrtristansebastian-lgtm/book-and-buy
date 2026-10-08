import { useId, useState } from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../../shared/ui/Button';
import { useDetailDialog } from '../../shared/ui/useDetailDialog';

const label = field => field.replace(/([a-z])([A-Z])/g,'$1 $2').replace(/^./,letter => letter.toUpperCase());
const describe = value => typeof value === 'string' ? value || '(empty)' : JSON.stringify(value,null,2);
export function WorkspaceSaveReview({ review, onResolve, onClose }) {
  const [busy,setBusy] = useState(false), [error,setError] = useState(''); const id=useId();
  const close = () => {if (!busy) onClose();}; const ref=useDetailDialog(true,close);
  const resolve = async action => {setBusy(true);setError('');ref.current?.focus();try {await onResolve(review,action);onClose();} catch (failure) {setError(failure.message || 'The workspace changed again. Close this review and try again.');setBusy(false);} };
  return createPortal(<div className="bb-services-sheet" ref={ref} tabIndex={-1} role="dialog" aria-modal="true" aria-labelledby={`${id}-title`} aria-busy={busy || undefined}>
    <div className="bb-services-sheet-backdrop" onClick={close} />
    <div className="bb-services-sheet-panel">
      <header className="bb-services-sheet-head"><h2 id={`${id}-title`} className="bb-services-sheet-title">Review your unsaved changes</h2></header>
      <div className="bb-services-sheet-body"><p>Another session changed your business. Compare the latest saved version with your draft before choosing what to keep.</p>
        {review.rows.length === 0 ? <p>Your changes are already in the cloud.</p> : review.rows.map(row => <section key={`${row.section}-${row.field}`} className="bb-panel p-4 grid gap-3"><h3 className="m-0 text-base">{label(row.field)}</h3><div className="grid gap-1"><strong className="text-sm">Latest saved version</strong><pre className="m-0 text-sm" style={{whiteSpace:'pre-wrap',wordBreak:'break-word',maxHeight:180,overflow:'auto',fontFamily:'inherit'}}>{describe(row.before)}</pre></div><div className="grid gap-1"><strong className="text-sm">Your draft</strong><pre className="m-0 text-sm" style={{whiteSpace:'pre-wrap',wordBreak:'break-word',maxHeight:180,overflow:'auto',fontFamily:'inherit'}}>{describe(row.after)}</pre></div></section>)}
        <p className="bb-muted text-sm">Keeping your draft replaces the fields shown above. Using the cloud version discards the unsaved changes on this device.</p>{error && <p role="alert">{error}</p>}
      </div>
      <footer className="bb-services-sheet-footer" style={{flexWrap:'wrap'}}><Button action="cancel" variant="secondary" disabled={busy} onClick={close}>Keep editing</Button><Button action="refresh" variant="secondary" disabled={busy} onClick={() => resolve('discard')}>Use cloud version</Button><Button action="save" variant="primary" busy={busy} busyLabel="Saving…" onClick={() => resolve('reapply')}>Keep my changes</Button></footer>
    </div>
  </div>,document.body);
}
