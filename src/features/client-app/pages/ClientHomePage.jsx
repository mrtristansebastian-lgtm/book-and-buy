import { useEffect, useMemo, useState } from 'react';
import { navigate, publicPagePath } from '../../../app/routing';
import { loadPublicWorkspaceFromFirestore } from '../../../shared/firebase/publicWorkspace';
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';
import { annotateSocialPosts } from '../ClientSocialShelf';
import { ClientHomeFeed } from '../ClientHomeFeed';

/** Instagram home feed from followed businesses. */
export function ClientHomePage() {
  const { workspace, loadDemoWorkspace } = useWorkspace();
  const { profile } = useClientProfile();
  const followed = profile?.followedSlugs || [];
  const [remoteFeeds, setRemoteFeeds] = useState([]);

  useEffect(() => {
    const wantsFlame =
      followed.includes('flameandflour') || followed.includes(workspace?.slug || '');
    if (wantsFlame && !(workspace?.socialPosts || []).length && loadDemoWorkspace) {
      loadDemoWorkspace();
    }
  }, [followed, workspace?.slug, workspace?.socialPosts?.length, loadDemoWorkspace]);

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
    const localSlug = workspace?.slug || 'flameandflour';
    const watchingLocal =
      followed.includes(localSlug) || followed.includes('flameandflour');

    if (watchingLocal) {
      buckets.push(
        ...annotateSocialPosts(workspace?.socialPosts || [], {
          slug: localSlug,
          brandName: workspace?.brandName || 'Flame & Flour',
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
  }, [workspace, followed, remoteFeeds]);

  const primarySlug = posts[0]?._slug || workspace?.slug || 'flameandflour';
  const noFollows = !followed.length;

  return (
    <ClientAppShell
      section="home"
      title="Home"
      headerRight={
        <button
          type="button"
          className="bb-client-text-btn"
          onClick={() => navigate(publicPagePath(primarySlug, 'social'))}
        >
          Open site
        </button>
      }
    >
      {noFollows ? (
        <div className="bb-client-empty-hero">
          <h2>Your feed is quiet</h2>
          <p className="bb-muted">
            Follow businesses in Explore to see their posts, films, verticals, and notes here.
          </p>
          <button type="button" className="bb-primary-btn" onClick={() => navigate('/app/explore')}>
            Explore
          </button>
        </div>
      ) : (
        <ClientHomeFeed
          posts={posts}
          emptyCta={
            <button type="button" className="bb-primary-btn" onClick={() => navigate('/app/explore')}>
              Explore
            </button>
          }
        />
      )}
    </ClientAppShell>
  );
}
