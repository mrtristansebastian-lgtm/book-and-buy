import { ClientAuthPage } from './pages/ClientAuthPage';
import { ClientHomePage } from './pages/ClientHomePage';
import { ClientExplorePage } from './pages/ClientExplorePage';
import { ClientMessagesPage } from './pages/ClientMessagesPage';
import { ClientAccountPage } from './pages/ClientAccountPage';
import { useClientProfile } from './ClientProfileContext';
import { navigate } from '../../app/routing';
import { useEffect } from 'react';

/** Top-level client app router for `#/app/...`. */
export function ClientApp({ section = 'home', rest = [] }) {
  const { isClient, profileReady } = useClientProfile();

  useEffect(() => {
    if (!profileReady) return;
    if (section !== 'auth' && !isClient) {
      navigate('/app/auth', { replace: true });
    }
    if (section === 'auth' && isClient) {
      navigate('/app/home', { replace: true });
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

  if (section === 'find') return <ClientExplorePage />;
  if (section === 'explore') return <ClientExplorePage mediaOnly />;
  if (section === 'messages') return <ClientMessagesPage threadId={rest[0] || ''} />;
  if (section === 'account') {
    return <ClientAccountPage section={rest[0] || ''} />;
  }
  return <ClientHomePage />;
}
