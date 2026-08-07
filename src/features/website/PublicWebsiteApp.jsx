import { useEffect, useState } from 'react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { loadPublicWorkspaceFromFirestore } from '../../shared/firebase/publicWorkspace';
import { isFirebaseConfigured } from '../../shared/firebase/client';
import { PublicSurfaceRenderer } from './components/PublicSurfaceRenderer';

function titleCaseSlug(slug) {
  return String(slug || '')
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function PublicWebsiteApp({ slug, page, itemId = '' }) {
  const { workspace: local } = useWorkspace();
  const [remote, setRemote] = useState(null);
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
    slug === local.slug || (slug === 'flour-and-flame' && (local.isDemo || local.slug === 'flour-and-flame'));

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
          socialPosts: [],
          website: {
            ...(local.website || {}),
            pages: { home: true, book: true, buy: true, social: true }
          }
        });

  if (loadingRemote && !loadTried) {
    return (
      <div className="bb-shell native-ui min-h-screen grid place-items-center bb-muted">
        Loading public site…
      </div>
    );
  }

  return (
    <div className="bb-shell native-ui min-h-screen bg-white">
      <PublicSurfaceRenderer
        workspace={workspace}
        page={page || 'home'}
        itemId={itemId || ''}
        publicMode={Boolean(remote) || !localMatch}
      />
    </div>
  );
}
