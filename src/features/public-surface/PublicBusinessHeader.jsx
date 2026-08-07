import { navigate, publicPagePath } from '../../app/routing';
import { E_BUSINESS_PAGES, isPublicPageEnabled } from '../../config/eBusinessPlatform';

export function PublicBusinessHeader({ slug, page, brandName, pages = {}, preview = false }) {
  const go = (path) => {
    if (preview) return;
    navigate(path);
  };

  return (
    <header className={`bb-public-header ${preview ? 'bb-public-header--preview' : ''}`}>
      <button
        type="button"
        className="bb-brand-mark text-xl bg-transparent border-0 p-0 cursor-pointer"
        onClick={() => go(publicPagePath(slug, 'home'))}
      >
        {brandName}
      </button>
      <nav className="bb-public-nav" aria-label="Business Platforms pages">
        {E_BUSINESS_PAGES.filter((link) => isPublicPageEnabled(pages, link.id)).map((link) => (
          <a
            key={link.id}
            href={preview ? undefined : `#${publicPagePath(slug, link.id)}`}
            aria-current={page === link.id ? 'page' : undefined}
            onClick={(event) => {
              event.preventDefault();
              go(publicPagePath(slug, link.id));
            }}
          >
            {link.label}
          </a>
        ))}
      </nav>
    </header>
  );
}
