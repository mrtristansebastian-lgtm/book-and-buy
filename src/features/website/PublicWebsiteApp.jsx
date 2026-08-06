import { PublicBusinessHeader } from '../public-surface/PublicBusinessHeader';
import { navigate, publicPagePath } from '../../app/routing';
import { useWorkspace } from '../workspace/WorkspaceContext';
import { PublicBookingFlow } from '../booking/components/PublicBookingFlow';
import { PublicStorefront } from '../storefront/components/PublicStorefront';
import { E_BUSINESS_PLATFORM_NAME } from '../../config/eBusinessPlatform';

function HomePage({ workspace }) {
  const website = workspace.website || {};
  const headline = website.homeHeadline || website.headline || workspace.brandName;
  const subcopy = website.homeSubtext || website.subcopy || workspace.tagline;

  return (
    <section className="relative min-h-[72vh] grid items-end overflow-hidden">
      <img
        src="/example/flour-and-flame/hero.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <div className="relative z-10 px-5 md:px-10 pb-10 md:pb-14 text-white grid gap-4 max-w-3xl">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.12em] text-white/70">
          {E_BUSINESS_PLATFORM_NAME}
        </p>
        <h1 className="bb-page-title text-white text-4xl md:text-6xl m-0">{workspace.brandName}</h1>
        <p className="m-0 text-lg md:text-xl text-white/90 max-w-xl">{subcopy || headline}</p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button
            type="button"
            className="bb-primary-btn"
            onClick={() => navigate(publicPagePath(workspace.slug, 'book'))}
          >
            {website.ctaLabel || 'Book now'}
          </button>
          <button
            type="button"
            className="bb-ghost-btn bg-white/90"
            onClick={() => navigate(publicPagePath(workspace.slug, 'buy'))}
          >
            Buy
          </button>
        </div>
      </div>
    </section>
  );
}

function BookPage({ workspace }) {
  const website = workspace.website || {};
  return (
    <div className="grid gap-2">
      {(website.bookHeadline || website.bookSubtext) && (
        <div className="px-5 md:px-10 pt-8 grid gap-1 max-w-4xl">
          {website.bookHeadline ? (
            <p className="bb-page-title text-2xl m-0">{website.bookHeadline}</p>
          ) : null}
          {website.bookSubtext ? <p className="bb-muted m-0">{website.bookSubtext}</p> : null}
        </div>
      )}
      <PublicBookingFlow workspaceName={workspace.brandName} />
    </div>
  );
}

function BuyPage({ workspace }) {
  const website = workspace.website || {};
  return (
    <div className="grid gap-2">
      {(website.buyHeadline || website.buySubtext) && (
        <div className="px-5 md:px-10 pt-8 grid gap-1 max-w-4xl">
          {website.buyHeadline ? (
            <p className="bb-page-title text-2xl m-0">{website.buyHeadline}</p>
          ) : null}
          {website.buySubtext ? <p className="bb-muted m-0">{website.buySubtext}</p> : null}
        </div>
      )}
      <PublicStorefront workspaceName={workspace.brandName} />
    </div>
  );
}

function SocialPage({ workspace }) {
  const website = workspace.website || {};
  const posts = [...(workspace.socialPosts || [])]
    .filter((post) => post.published !== false)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || (b.createdAt || 0) - (a.createdAt || 0));

  return (
    <section className="px-5 md:px-10 py-10 grid gap-6 max-w-3xl">
      <header className="grid gap-2">
        <p className="m-0 text-xs font-bold uppercase tracking-[0.08em] text-black/35">
          {E_BUSINESS_PLATFORM_NAME}
        </p>
        <h1 className="bb-page-title text-4xl m-0">
          {website.socialHeadline || 'Social'}
        </h1>
        <p className="bb-muted m-0">
          {website.socialSubtext || `Updates from ${workspace.brandName}.`}
        </p>
      </header>

      <div className="grid gap-4">
        {posts.length === 0 ? (
          <div className="bb-panel p-6 bb-muted">No posts published yet.</div>
        ) : (
          posts.map((post) => (
            <article key={post.id} className="bb-panel overflow-hidden grid">
              {post.type === 'image' && post.mediaUrl ? (
                <div className="aspect-[4/3] bg-black/5">
                  <img src={post.mediaUrl} alt="" className="w-full h-full object-cover" />
                </div>
              ) : null}
              <div className="p-5 grid gap-2">
                {post.title ? <h2 className="bb-page-title text-xl m-0">{post.title}</h2> : null}
                <p className="m-0 leading-relaxed">{post.caption}</p>
              </div>
            </article>
          ))
        )}
      </div>
    </section>
  );
}

export function PublicWebsiteApp({ slug, page }) {
  const { workspace: demo } = useWorkspace();
  const workspace =
    slug === demo.slug || slug === 'flour-and-flame'
      ? demo
      : {
          ...demo,
          slug,
          brandName: slug
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        };

  const body = {
    home: <HomePage workspace={workspace} />,
    book: <BookPage workspace={workspace} />,
    buy: <BuyPage workspace={workspace} />,
    social: <SocialPage workspace={workspace} />
  }[page] || <HomePage workspace={workspace} />;

  return (
    <div className="bb-shell native-ui min-h-screen bg-white">
      <PublicBusinessHeader
        slug={workspace.slug}
        page={page}
        brandName={workspace.brandName}
        pages={workspace.website?.pages}
      />
      {body}
    </div>
  );
}
