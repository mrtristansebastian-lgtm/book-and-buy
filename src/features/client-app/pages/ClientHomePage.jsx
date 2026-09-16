import { useEffect, useMemo, useState } from 'react';
import { navigate, publicPagePath } from '../../../app/routing';
import { loadPublicWorkspaceFromFirestore } from '../../../shared/firebase/publicWorkspace';
import { isFirebaseConfigured } from '../../../shared/firebase/client';
import { useWorkspace } from '../../workspace/WorkspaceContext';
import { SocialPostFeed } from '../../social/components/SocialPostFeed';
import { getSocialPostKind } from '../../social/utils/socialPostType';
import { ClientAppShell } from '../ClientAppShell';
import { useClientProfile } from '../ClientProfileContext';

function publishedPosts(socialPosts = [], brandMeta = {}) {
  return (socialPosts || [])
    .filter((post) => {
      if (post.visibility && post.visibility !== 'published') return false;
      const kind = getSocialPostKind(post);
      return kind === 'post' || kind === 'note' || !kind;
    })
    .map((post) => ({
      ...post,
      _brandName: brandMeta.brandName,
      _slug: brandMeta.slug,
      _logoUrl: brandMeta.logoUrl || ''
    }));
}

/** Aggregated feed from followed businesses. */
export function ClientHomePage() {
  const { workspace } = useWorkspace();
  const { profile } = useClientProfile();
  const followed = profile?.followedSlugs || [];
  const [remoteFeeds, setRemoteFeeds] = useState([]);

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
              logoUrl: snap.logoUrl || '',
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
        ...publishedPosts(workspace?.socialPosts || [], {
          slug: localSlug,
          brandName: workspace?.brandName || 'Flame & Flour',
          logoUrl: workspace?.logoUrl || ''
        })
      );
    }

    remoteFeeds.forEach((feed) => {
      if (feed.slug === localSlug) return;
      buckets.push(
        ...publishedPosts(feed.socialPosts || [], {
          slug: feed.slug,
          brandName: feed.brandName,
          logoUrl: feed.logoUrl
        })
      );
    });

    const seen = new Set();
    return buckets
      .filter((post) => {
        const key = post.id || `${post._slug}-${post.createdAt || post.at || post.caption}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      })
      .sort((a, b) => (b.createdAt || b.at || 0) - (a.createdAt || a.at || 0));
  }, [workspace, followed, remoteFeeds]);

  const primarySlug = posts[0]?._slug || workspace?.slug || 'flameandflour';
  const primaryBrand = posts[0]?._brandName || workspace?.brandName || 'Flame & Flour';
  const empty = !followed.length || posts.length === 0;

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
      {empty ? (
        <div className="bb-client-empty-hero">
          <h2>Your feed is quiet</h2>
          <p className="bb-muted">
            Follow businesses in Explore to see their posts here — same vibe as Instagram, for your
            bookings world.
          </p>
          <button type="button" className="bb-primary-btn" onClick={() => navigate('/app/explore')}>
            Explore businesses
          </button>
        </div>
      ) : (
        <div className="bb-client-feed">
          <SocialPostFeed
            posts={posts}
            brandName={primaryBrand}
            slug={primarySlug}
            logoUrl={posts[0]?._logoUrl || workspace?.logoUrl || ''}
            editMode={false}
            showPublishToggle={false}
            onBack={() => navigate(publicPagePath(primarySlug, 'social'))}
          />
        </div>
      )}
    </ClientAppShell>
  );
}
