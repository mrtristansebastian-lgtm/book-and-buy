import { useState } from 'react';
import { Button } from '../../../shared/ui/Button';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { useClientProfile } from '../../client-app/ClientProfileContext';
import { startClientMessage } from '../../client-app/startClientMessage';
import { profileSignInPath } from '../../client-app/profileAuthReturn';
import { navigate } from '../../../app/routing';
import { getServiceTimingMode } from '../../../../functions/serviceTiming';

export function ServiceTimingConversation({ service, workspace, preview = false, optionName = '' }) {
  const { profile } = useClientProfile();
  const { workspace: local, startThreadFromClient } = useWorkspace();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const arranged = getServiceTimingMode(service) === 'arranged';
  const message = async () => {
    if (busy || preview) return;
    if (!profile?.email) { navigate(profileSignInPath(workspace.slug)); return; }
    setBusy(true); setError('');
    try {
      await startClientMessage({ profile, workspace, requireThread: true,
        subject: `${arranged ? 'Arrange timing' : 'Upcoming dates'} · ${service.name}${optionName ? ` · ${optionName}` : ''}`,
        startThreadFromClient: workspace.isDemo && workspace.slug === local.slug ? startThreadFromClient : undefined });
    } catch { setError('Could not open the conversation. Please try again.'); }
    finally { setBusy(false); }
  };
  return <section className="bb-service-timing-conversation">
    <p>{arranged ? 'Message the business to agree a date, time or ongoing schedule that works for you.' : 'Dates have not been announced yet. Message the business to ask about upcoming sessions.'}</p>
    {service.timingNotes && <p style={{ whiteSpace: 'pre-wrap' }}>{service.timingNotes}</p>}
    <Button action="chat" variant="primary" type="button" busy={busy} disabled={preview} onClick={message}>
      {arranged ? 'Arrange a time' : 'Ask about dates'}
    </Button>
    {error && <p role="alert">{error}</p>}
  </section>;
}
