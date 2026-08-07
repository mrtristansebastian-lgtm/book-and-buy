import { navigate, publicPagePath } from '../../../app/routing';
import { PublicBookingFlow } from '../../booking/components/PublicBookingFlow';
import { PublicStorefront } from '../../storefront/components/PublicStorefront';

const DEFAULT_HERO = '/example/flour-and-flame/hero.webp';

function go(preview, path) {
  if (preview) return;
  navigate(path);
}

export function PublicHomeView({ workspace, preview = false }) {
  const website = workspace.website || {};
  const brand = workspace.brandName || 'Business';
  // Brand is the display title; studio Headline / Supporting line feed this sentence.
  const support =
    website.homeHeadline ||
    website.homeSubtext ||
    website.headline ||
    website.subcopy ||
    workspace.tagline ||
    '';
  const heroSrc = website.heroImageUrl || website.heroImage || DEFAULT_HERO;

  return (
    <section className="bb-public-home">
      <div className="absolute inset-0 bb-public-home-atmosphere" aria-hidden="true" />
      <img src={heroSrc} alt="" className="absolute inset-0 w-full h-full object-cover" />
      <div className="absolute inset-0 bb-public-home-scrim" aria-hidden="true" />
      <div className="bb-public-home-copy bb-public-gutter">
        <h1 className="bb-public-home-brand">{brand}</h1>
        {support ? <p className="bb-public-home-support">{support}</p> : null}
        <div className="bb-public-home-ctas">
          <button
            type="button"
            className="bb-primary-btn"
            onClick={() => go(preview, publicPagePath(workspace.slug, 'book'))}
          >
            {website.ctaLabel || 'Book now'}
          </button>
          <button
            type="button"
            className="bb-ghost-btn bg-white/92"
            onClick={() => go(preview, publicPagePath(workspace.slug, 'buy'))}
          >
            Buy
          </button>
        </div>
      </div>
    </section>
  );
}

export function PublicBookView({ workspace, preview = false }) {
  const website = workspace.website || {};
  const title = website.bookHeadline || 'Book';
  const subtext =
    website.bookSubtext ||
    `Choose a service and request a time with ${workspace.brandName || 'us'}.`;

  return (
    <div className={`bb-public-book ${preview ? 'bb-public-preview-flow' : ''}`}>
      <div className="bb-public-page-intro bb-public-gutter">
        <div className="bb-public-measure grid gap-2">
          <h1 className="bb-page-title">{title}</h1>
          <p className="bb-public-lede">{subtext}</p>
        </div>
      </div>
      <PublicBookingFlow
        workspaceName={workspace.brandName}
        hideTitle
        preview={preview}
      />
    </div>
  );
}

export function PublicBuyView({ workspace, preview = false }) {
  const website = workspace.website || {};
  const title = website.buyHeadline || 'Buy';
  const subtext =
    website.buySubtext ||
    `Kitchen goods and take-home sets from ${workspace.brandName || 'this business'}.`;

  return (
    <div className={`bb-public-buy ${preview ? 'bb-public-preview-flow' : ''}`}>
      <PublicStorefront
        workspaceName={workspace.brandName}
        title={title}
        subtext={subtext}
        preview={preview}
      />
    </div>
  );
}

export function PublicSocialView({ workspace }) {
  const website = workspace.website || {};
  const posts = [...(workspace.socialPosts || [])]
    .filter((post) => post.published !== false)
    .sort(
      (a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.createdAt || 0) - (a.createdAt || 0)
    );

  return (
    <section className="bb-public-social bb-public-gutter">
      <div className="bb-public-measure grid gap-8">
        <header className="bb-public-social-header grid gap-3">
          <h1 className="bb-page-title">{website.socialHeadline || 'Social'}</h1>
          <p className="bb-public-lede m-0">
            {website.socialSubtext || `Updates from ${workspace.brandName}.`}
          </p>
        </header>

        <div className="bb-public-social-feed">
          {posts.length === 0 ? (
            <div className="bb-public-empty">No posts published yet.</div>
          ) : (
            posts.map((post) => {
              const isImage = post.type === 'image' && post.mediaUrl;
              return (
                <article
                  key={post.id}
                  className={`bb-public-social-card ${
                    isImage ? 'bb-public-social-card--image' : 'bb-public-social-card--text'
                  }`}
                >
                  {isImage ? (
                    <div className="bb-public-social-media">
                      <img src={post.mediaUrl} alt="" />
                    </div>
                  ) : null}
                  <div className="bb-public-social-body">
                    {post.title ? (
                      <h2 className="bb-page-title">{post.title}</h2>
                    ) : null}
                    {post.caption ? (
                      <p className="bb-public-social-caption">{post.caption}</p>
                    ) : null}
                  </div>
                </article>
              );
            })
          )}
        </div>
      </div>
    </section>
  );
}
