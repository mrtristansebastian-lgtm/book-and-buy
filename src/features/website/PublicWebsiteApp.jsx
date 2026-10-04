import { useEffect, useState } from 'react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { loadPublicWorkspaceFromFirestore } from '../../shared/firebase/publicWorkspace';
import { isFirebaseConfigured } from '../../shared/firebase/client';
import { PublicSurfaceRenderer } from './components/PublicSurfaceRenderer';
import { useAuth } from '../auth/AuthContext';
import { filterWorkspaceForMarket, resolveMarket } from '../../utils/markets';
import { MarketCountryPicker } from '../settings/components/MarketCountryPicker';
import { Button } from '../../shared/ui/Button';
import { navigate } from '../../app/routing';
import { resolvePublicProfile } from './publicProfileState';

export function PublicWebsiteApp({ slug, page, itemId = '', allowLocalDemo = true }) {
  const { user } = useAuth();
  const { workspace: local } = useWorkspace();
  const configured = isFirebaseConfigured();
  const [lookup, setLookup] = useState({ slug: '', status: 'loading', workspace: null });
  const [buyerCountry, setBuyerCountry] = useState('');
  const localMatch = slug === local.slug ||
    ((slug === 'flour-and-flame' || slug === 'flameandflour') &&
      (local.isDemo || local.slug === 'flour-and-flame' || local.slug === 'flameandflour'));
  const useLocalDemo = allowLocalDemo && local.isDemo && localMatch;

  useEffect(() => {
    let cancelled = false;
    setBuyerCountry('');
    if (useLocalDemo || !configured) {
      setLookup({ slug, status: 'ready', workspace: null });
      return undefined;
    }
    setLookup({ slug, status: 'loading', workspace: null });
    loadPublicWorkspaceFromFirestore(slug)
      .then((doc) => {
        if (!cancelled) setLookup({ slug, status: 'ready', workspace: doc });
      })
      .catch(() => {
        if (!cancelled) setLookup({ slug, status: 'error', workspace: null });
      });

    return () => {
      cancelled = true;
    };
  }, [slug, useLocalDemo, configured]);

  const resolved = resolvePublicProfile({ slug, local, lookup, configured, useLocalDemo,
    viewerId: user?.uid, allowOwnerPreview: allowLocalDemo });
  if (resolved.status === 'loading') {
    return (
      <div className="bb-shell native-ui min-h-screen grid place-items-center bb-muted">
        Loading business profile…
      </div>
    );
  }
  if (!resolved.workspace) {
    return <div className="bb-shell native-ui min-h-screen bg-white grid place-items-center">
      <section className="bb-public-profile-unavailable">
        <h1>Business profile unavailable</h1>
        <p>{resolved.status === 'error' ? 'We could not load this profile. Please try again shortly.' : 'This profile has not been published, or the link is no longer available.'}</p>
        <Button action="back" variant="secondary" onClick={() => navigate('/app/find')}>Back to Places</Button>
      </section>
    </div>;
  }
  const workspace = resolved.workspace;
  const ownerViewingOwnSite = Boolean(user?.uid && workspace.ownerId === user.uid);
  const marketConfigured = Array.isArray(workspace.website?.markets);
  const showCountryPicker = marketConfigured && ['book', 'buy', 'cart', 'checkout'].includes(page);
  const market = resolveMarket(workspace.website || {}, buyerCountry);
  const buyerWorkspace = filterWorkspaceForMarket(workspace, buyerCountry);

  return (
    <div className="bb-shell native-ui min-h-screen bg-white">
      {!useLocalDemo && !resolved.publicMode ? <p className="bb-public-profile-preview-notice" role="status">Owner preview — this profile is not published yet.</p> : null}
      <PublicSurfaceRenderer
        workspace={buyerWorkspace}
        page={page || 'home'}
        itemId={itemId || ''}
        publicMode={resolved.publicMode}
        trackAnalytics={resolved.publicMode && !ownerViewingOwnSite}
        marketPicker={showCountryPicker ? <div className="bb-public-market-picker">
          <MarketCountryPicker label="Your shopping country" value={buyerCountry} onChange={setBuyerCountry} allowRestOfWorld={false} resetOnSearch={false} />
          {!buyerCountry && <span role="status">Choose your country to see available products and services.</span>}
          {buyerCountry && !market?.enabled && <span role="status">This business does not currently sell to this country.</span>}
        </div> : null}
      />
    </div>
  );
}
