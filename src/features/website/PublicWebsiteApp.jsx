import { PublicBusinessHeader } from '../public-surface/PublicBusinessHeader';
import { DEMO_WORKSPACE } from '../../config/workspaceDefaults';
import { navigate } from '../../app/routing';

function HomePage({ workspace }) {
  return (
    <section className="relative min-h-[72vh] grid items-end overflow-hidden">
      <img
        src="/example/flour-and-flame/hero.webp"
        alt=""
        className="absolute inset-0 w-full h-full object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/25 to-transparent" />
      <div className="relative z-10 px-5 md:px-10 pb-10 md:pb-14 text-white grid gap-4 max-w-3xl">
        <h1 className="bb-page-title text-white text-4xl md:text-6xl m-0">{workspace.brandName}</h1>
        <p className="m-0 text-lg md:text-xl text-white/90 max-w-xl">
          {workspace.website?.subcopy || workspace.tagline}
        </p>
        <div className="flex flex-wrap gap-3 pt-1">
          <button type="button" className="bb-primary-btn" onClick={() => navigate(`/w/${workspace.slug}/book`)}>
            {workspace.website?.ctaLabel || 'Book now'}
          </button>
          <button type="button" className="bb-ghost-btn bg-white/90" onClick={() => navigate(`/w/${workspace.slug}/shop`)}>
            Shop
          </button>
        </div>
      </div>
    </section>
  );
}

function BookPage({ workspace }) {
  return (
    <section className="px-5 md:px-10 py-10 grid gap-4 max-w-3xl">
      <h1 className="bb-page-title text-4xl m-0">Book</h1>
      <p className="bb-muted m-0">
        Public booking flow for {workspace.brandName} lands here next — service, date, time, request.
      </p>
    </section>
  );
}

function ShopPage({ workspace }) {
  return (
    <section className="px-5 md:px-10 py-10 grid gap-4 max-w-3xl">
      <h1 className="bb-page-title text-4xl m-0">Shop</h1>
      <p className="bb-muted m-0">
        Storefront cart and checkout for {workspace.brandName} lands here next.
      </p>
    </section>
  );
}

function SocialPage({ workspace }) {
  return (
    <section className="px-5 md:px-10 py-10 grid gap-4 max-w-3xl">
      <h1 className="bb-page-title text-4xl m-0">Social</h1>
      <p className="bb-muted m-0">
        Published posts from {workspace.brandName} will appear here.
      </p>
    </section>
  );
}

export function PublicWebsiteApp({ slug, page }) {
  const workspace =
    slug === DEMO_WORKSPACE.slug || slug === 'flour-and-flame'
      ? DEMO_WORKSPACE
      : {
          ...DEMO_WORKSPACE,
          slug,
          brandName: slug
            .split('-')
            .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
            .join(' ')
        };

  const body = {
    home: <HomePage workspace={workspace} />,
    book: <BookPage workspace={workspace} />,
    shop: <ShopPage workspace={workspace} />,
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
