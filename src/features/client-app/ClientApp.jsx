import { ClientAuthPage } from './pages/ClientAuthPage';
import { ClientExplorePage } from './pages/ClientExplorePage';
import { ClientMessagesPage } from './pages/ClientMessagesPage';
import { ClientAccountPage } from './pages/ClientAccountPage';
import { useClientProfile } from './ClientProfileContext';
import { getLocationPath, navigate } from '../../app/routing';
import { clientAuthRedirect } from './profileAuthReturn';
import { useEffect } from 'react';

/** Top-level client app router for `#/app/...`. */
export function ClientApp({ section = 'discovery', rest = [] }) {
  const { isClient, profileReady } = useClientProfile();

  useEffect(() => {
    if (!profileReady) return;
    if (section !== 'auth' && !isClient) {
      navigate('/app/auth', { replace: true });
    }
    if (section === 'auth' && isClient) {
      const target = clientAuthRedirect(getLocationPath());
      if (target) navigate(target, { replace: true });
    }
  }, [section, isClient, profileReady]);

  if (!profileReady) {
    return (
      <div className="bb-client-shell grid place-items-center bb-muted">Loading…</div>
    );
  }

  if (section === 'auth' || !isClient) {
    return <ClientAuthPage />;
  }

  if (section === 'discovery') return <ClientExplorePage />;
  if (section === 'messages') return <ClientMessagesPage threadId={rest[0] || ''} />;
  if (section === 'account') {
    return <ClientAccountPage section={rest[0] || ''} />;
  }
  return <ClientExplorePage />;
}
