import { useEffect, useState } from 'react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { loadPublicWorkspaceFromFirestore } from '../../shared/firebase/publicWorkspace';
import { isFirebaseConfigured } from '../../shared/firebase/client';
import { PublicSurfaceRenderer } from './components/PublicSurfaceRenderer';
import { useAuth } from '../auth/AuthContext';
import { filterWorkspaceForMarket, resolveMarket } from '../../utils/markets';
import { MarketCountryPicker } from '../settings/components/MarketCountryPicker';

function titleCaseSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PublicWebsiteApp({ slug, page, itemId = '', allowLocalDemo = true }) {
  const { user } = useAuth();
  const { workspace: local } = useWorkspace();
  const [remote, setRemote] = useState(null);
  const [buyerCountry, setBuyerCountry] = useState('');
  const [loadingRemote, setLoadingRemote] = useState(() => isFirebaseConfigured());
  const [loadTried, setLoadTried] = useState(!isFirebaseConfigured());
  const localMatch = slug === local.slug ||
    ((slug === 'flour-and-flame' || slug === 'flameandflour') &&
      (local.isDemo || local.slug === 'flour-and-flame' || local.slug === 'flameandflour'));
  const useLocalDemo = allowLocalDemo && local.isDemo && localMatch;

  useEffect(() => {
    let cancelled = false;
    if (useLocalDemo || !isFirebaseConfigured()) {
      setRemote(null);
      setLoadingRemote(false);
      setLoadTried(true);
      return undefined;
    }

    setRemote(null);
    setLoadingRemote(true);
    setLoadTried(false);
    loadPublicWorkspaceFromFirestore(slug)
      .then((doc) => {
        if (!cancelled) setRemote(doc);
      })
      .catch(() => {
        if (!cancelled) setRemote(null);
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingRemote(false);
          setLoadTried(true);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [slug, useLocalDemo]);

  const workspace =
    (useLocalDemo ? local : remote) ||
    (localMatch
      ? local
      : {
          ...local,
          slug,
          brandName: titleCaseSlug(slug),
          services: [],
          products: [],
          website: {
            ...(local.website || {}),
            pages: { home: true, book: true, buy: true }
          }
        });
  const ownerViewingOwnSite = Boolean(user?.uid && workspace?.ownerId === user.uid);
  const marketConfigured = Array.isArray(workspace.website?.markets);
  const market = resolveMarket(workspace.website || {}, buyerCountry);
  const buyerWorkspace = filterWorkspaceForMarket(workspace, buyerCountry);

  if (!useLocalDemo && loadingRemote && !loadTried) {
    return (
      <div className="bb-shell native-ui min-h-screen grid place-items-center bb-muted">
        Loading public site…
      </div>
    );
  }

  return (
    <div className="bb-shell native-ui min-h-screen bg-white">
      {marketConfigured && <div className="bb-public-market-picker">
        <MarketCountryPicker label="Your shopping country" value={buyerCountry} onChange={setBuyerCountry} allowRestOfWorld={false} resetOnSearch={false} />
        {!buyerCountry && <span role="status">Choose your country to see available products and services.</span>}
        {buyerCountry && !market?.enabled && <span role="status">This business does not currently sell to this country.</span>}
      </div>}
      <PublicSurfaceRenderer
        workspace={buyerWorkspace}
        page={page || 'home'}
        itemId={itemId || ''}
        publicMode={!useLocalDemo && (Boolean(remote) || !localMatch)}
        trackAnalytics={!useLocalDemo && !ownerViewingOwnSite}
      />
    </div>
  );
}
