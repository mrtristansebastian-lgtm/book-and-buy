import { useEffect, useMemo, useState } from 'react';
import { Compass } from 'lucide-react';
import { navigate } from '../../../app/routing';
import { loadPublicWorkspaceFromFirestore } from '../../../shared/firebase/publicWorkspace';
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { EmptyState } from '../../../shared/ui/EmptyState';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';
import { annotateSocialPosts } from '../ClientSocialShelf';
import { ClientHomeFeed } from '../ClientHomeFeed';

/** Instagram home feed from followed businesses. */
export function ClientHomePage() {
  const { workspace } = useWorkspace();
  const { profile } = useClientProfile();
  const followed = profile?.followedSlugs || [];
  const [remoteFeeds, setRemoteFeeds] = useState([]);
  const isDemo = Boolean(workspace?.isDemo || profile?.isDemo);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!followed.length || !isFirebaseConfigured()) {
        if (!cancelled) setRemoteFeeds([]);
        return;
      }
      const rows = await Promise.all(
        followed.map(async (slug) => {
          try {
            const snap = await loadPublicWorkspaceFromFirestore(slug);
            if (!snap) return null;
            return {
              slug,
              brandName: snap.brandName || slug,
              logoUrl: snap.logoUrl || snap.website?.logoUrl || '',
              socialPosts: snap.socialPosts || []
            };
          } catch {
            return null;
          }
        })
      );
      if (!cancelled) setRemoteFeeds(rows.filter(Boolean));
    })();
    return () => {
      cancelled = true;
    };
  }, [followed]);

  const posts = useMemo(() => {
    const buckets = [];
    const localSlug = String(workspace?.slug || '').trim();
    const watchingLocal = Boolean(localSlug) && followed.includes(localSlug);

    if (watchingLocal && (isDemo || (workspace?.socialPosts || []).length)) {
      buckets.push(
        ...annotateSocialPosts(workspace?.socialPosts || [], {
          slug: localSlug,
          brandName: workspace?.brandName || localSlug,
          logoUrl: workspace?.logoUrl || workspace?.website?.logoUrl || ''
        })
      );
    }

    remoteFeeds.forEach((feed) => {
      if (feed.slug === localSlug && watchingLocal) return;
      buckets.push(
        ...annotateSocialPosts(feed.socialPosts || [], {
          slug: feed.slug,
          brandName: feed.brandName,
          logoUrl: feed.logoUrl
        })
      );
    });

    const seen = new Set();
    return buckets.filter((post) => {
      const key = post.id || `${post._slug}-${post.createdAt || post.at || post.caption}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }, [workspace, followed, remoteFeeds, isDemo]);

  const noFollows = !followed.length;

  return (
    <ClientAppShell section="home" title="Home">
      {noFollows ? (
        <EmptyState
          icon={Compass}
          title="Your feed is quiet"
          description="Follow businesses in Explore to see their posts, films, verticals, and notes here."
          action={
            <button type="button" className="bb-primary-btn" onClick={() => navigate('/app/find')}>
              Find businesses
            </button>
          }
        />
      ) : (
        <ClientHomeFeed
          posts={posts}
          emptyCta={
            <button type="button" className="bb-primary-btn" onClick={() => navigate('/app/find')}>
              Find businesses
            </button>
          }
        />
      )}
    </ClientAppShell>
  );
}
