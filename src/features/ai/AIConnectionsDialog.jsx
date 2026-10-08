import { useRef } from 'react';
import { X } from 'lucide-react';
import { Button } from '../../shared/ui/Button';
import { useDialogFocus } from '../../shared/ui/useDialogFocus';
import { AISettingsPage } from '../settings/pages/AISettingsPage';
import '../builder/builder-page.css';
export function AIConnectionsDialog({ open = true, onClose, onChanged }) {
  const ref = useRef(null);
  useDialogFocus(ref, open, onClose);
  if (!open) return null;
  return <div className="bb-builder-commerce-overlay" onClick={event => { if (event.target === event.currentTarget) onClose(); }}><section ref={ref} className="bb-builder-commerce-panel bb-ai-connections" role="dialog" aria-modal="true" aria-labelledby="ai-connection-title"><header><div><h2 id="ai-connection-title">AI connections</h2><p>Your AI, connected to your business.</p></div><Button icon={X} variant="secondary" aria-label="Close AI connections" onClick={onClose}/></header><div className="bb-builder-commerce-body"><AISettingsPage onChanged={onChanged}/></div></section></div>;
}
