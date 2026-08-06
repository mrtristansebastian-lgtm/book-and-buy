import { useEffect, useState } from 'react';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { loadPublicWorkspaceFromFirestore } from '../../shared/firebase/publicWorkspace';
import { isFirebaseConfigured } from '../../shared/firebase/client';
import { PublicSurfaceRenderer } from './components/PublicSurfaceRenderer';

export function PublicWebsiteApp({ slug, page }) {
  const { workspace: local } = useWorkspace();
  const [remote, setRemote] = useState(null);
  const [loadingRemote, setLoadingRemote] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const matchesLocal = slug === local.slug || slug === 'flour-and-flame';
    if (matchesLocal || !isFirebaseConfigured()) {
      setRemote(null);
      setLoadingRemote(false);
      return undefined;
    }
    setLoadingRemote(true);
    loadPublicWorkspaceFromFirestore(slug)
      .then((doc) => {
        if (!cancelled) setRemote(doc);
      })
      .catch(() => {
        if (!cancelled) setRemote(null);
      })
      .finally(() => {
        if (!cancelled) setLoadingRemote(false);
      });
    return () => {
      cancelled = true;
    };
  }, [slug, local.slug]);

  const workspace =
    remote ||
    (slug === local.slug || slug === 'flour-and-flame'
      ? local
      : {
          ...local,
          slug,
          brandName: slug
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        });

  if (loadingRemote) {
    return (
      <div className="bb-shell native-ui min-h-screen grid place-items-center bb-muted">
        Loading public site…
      </div>
    );
  }

  return (
    <div className="bb-shell native-ui min-h-screen bg-white">
      <PublicSurfaceRenderer workspace={workspace} page={page || 'home'} />
    </div>
  );
}
