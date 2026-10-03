import { useRef, useState } from 'react';
import { ArrowLeft, X } from 'lucide-react';
import { ClientsPage } from '../../clients/pages/ClientsPage';
import { useDialogFocus } from '../../../shared/ui/useDialogFocus';

export function ClientFileDrawer({ open, onClose, client }) {
  const panel = useRef(null);
  const [editing, setEditing] = useState(false);
  useDialogFocus(panel, open && Boolean(client), onClose, editing);
  if (!open || !client) return null;
  return <div className="bb-client-file-overlay" onClick={onClose}>
    <section ref={panel} className="bb-client-file-dialog" role="dialog" aria-modal="true" aria-label={`Client file for ${client.name}`} tabIndex={-1} onClick={(event) => event.stopPropagation()}>
      <header className="bb-client-file-dialog-head">
        <button type="button" className="bb-client-file-back" onClick={onClose}><ArrowLeft size={18} aria-hidden="true" /> Back to chat</button>
        <span>Client file</span>
        <button type="button" className="bb-client-file-close" aria-label="Close client file" onClick={onClose}><X size={18} aria-hidden="true" /></button>
      </header>
      <ClientsPage fileClient={client} onEditorOpenChange={setEditing} onReturnToChat={onClose} />
    </section>
  </div>;
}
