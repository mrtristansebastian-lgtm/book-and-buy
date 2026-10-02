import { useEffect, useState } from 'react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { loadPublicWorkspaceFromFirestore } from '../../shared/firebase/publicWorkspace';
import { isFirebaseConfigured } from '../../shared/firebase/client';
import { PublicSurfaceRenderer } from './components/PublicSurfaceRenderer';
import { useAuth } from '../auth/AuthContext';
import { filterWorkspaceForMarket, resolveMarket } from '../../utils/markets';
import { MARKET_COUNTRIES } from '../../config/marketCountries';

function titleCaseSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PublicWebsiteApp({ slug, page, itemId = '' }) {
  const { user } = useAuth();
  const { workspace: local } = useWorkspace();
  const [remote, setRemote] = useState(null);
  const [buyerCountry, setBuyerCountry] = useState('');
  const [loadingRemote, setLoadingRemote] = useState(() => isFirebaseConfigured());
  const [loadTried, setLoadTried] = useState(!isFirebaseConfigured());

  useEffect(() => {
    let cancelled = false;
    if (!isFirebaseConfigured()) {
      setRemote(null);
      setLoadingRemote(false);
      setLoadTried(true);
      return undefined;
    }

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
  }, [slug]);

  const localMatch =
    slug === local.slug ||
    ((slug === 'flour-and-flame' || slug === 'flameandflour') &&
      (local.isDemo || local.slug === 'flour-and-flame' || local.slug === 'flameandflour'));

  const workspace =
    remote ||
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

  if (loadingRemote && !loadTried) {
    return (
      <div className="bb-shell native-ui min-h-screen grid place-items-center bb-muted">
        Loading public site…
      </div>
    );
  }

  return (
    <div className="bb-shell native-ui min-h-screen bg-white">
      {marketConfigured && <div className="bb-public-market-picker">
        <label>Shopping from <select value={buyerCountry} onChange={(event) => setBuyerCountry(event.target.value)} aria-label="Your shopping country"><option value="">Choose your country</option>{MARKET_COUNTRIES.map((country) => <option key={country.code} value={country.code}>{country.label}</option>)}</select></label>
        {buyerCountry && !market?.enabled && <span role="status">This business does not currently sell to this country.</span>}
      </div>}
      <PublicSurfaceRenderer
        workspace={buyerWorkspace}
        page={page || 'home'}
        itemId={itemId || ''}
        publicMode={Boolean(remote) || !localMatch}
        trackAnalytics={!ownerViewingOwnSite}
      />
    </div>
  );
}
